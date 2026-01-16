/**
 * Cloudflare Worker for MashAI Feedback
 * Handles secure forwarding of feedback to Discord and Web3Forms
 */

export default {
    async fetch(request, env, ctx) {
        // 1. Handle CORS Preflight
        if (request.method === "OPTIONS") {
            return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                },
            });
        }

        // 2. Only allow POST
        if (request.method !== "POST") {
            return new Response("Method Not Allowed", { status: 405 });
        }

        try {
            // 3. Parse Body
            const data = await request.json();
            const { type, message, email, version, os } = data;

            if (!message) {
                return new Response("Message is required", { status: 400 });
            }

            // 4. Determine Handling Strategy (Email vs Anonymous)
            const hasEmail = email && email.trim().length > 0;
            let response; // Declare at higher scope so it's accessible later

            if (hasEmail) {
                // --- Strategy A: Send via Web3Forms (Secure Proxy) ---
                // We reconstruct the payload here so the client doesn't need the key
                const web3Payload = {
                    access_key: env.WEB3FORMS_ACCESS_KEY,
                    subject: `[MashAI ${type.toUpperCase()}] App Feedback`,
                    from_name: email,
                    email: email,
                    message: `Type: ${type}\nVersion: ${version}\nOS: ${os}\n\n${message}`,
                };

                response = await fetch("https://api.web3forms.com/submit", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(web3Payload),
                });
            } else {
                // --- Strategy B: Send via Discord Webhook ---
                // Select webhook based on type
                let webhookUrl = env.DISCORD_WEBHOOK_GENERAL; // Default
                if (type === 'bug' && env.DISCORD_WEBHOOK_BUG) webhookUrl = env.DISCORD_WEBHOOK_BUG;
                if (type === 'suggestion' && env.DISCORD_WEBHOOK_SUGGESTION) webhookUrl = env.DISCORD_WEBHOOK_SUGGESTION;
                if (type === 'question' && env.DISCORD_WEBHOOK_QUESTION) webhookUrl = env.DISCORD_WEBHOOK_QUESTION;

                if (!webhookUrl) {
                    return new Response("Server configuration error: Missing webhook", { status: 500 });
                }

                const discordPayload = {
                    embeds: [{
                        title: `App Feedback: ${type}`,
                        description: message,
                        color: getColorForType(type),
                        fields: [
                            { name: "App Version", value: version || "Unknown", inline: true },
                            { name: "OS", value: os || "Unknown", inline: true },
                        ],
                        timestamp: new Date().toISOString(),
                    }],
                };

                response = await fetch(webhookUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(discordPayload),
                });
            }

            // 5. Return Result
            if (response.ok) {
                return new Response(JSON.stringify({ success: true }), {
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            } else {
                // Capture upstream error details
                const errorText = await response.text();
                return new Response(JSON.stringify({
                    error: "Upstream service failed",
                    details: errorText
                }), {
                    status: 502,
                    headers: {
                        "Content-Type": "application/json",
                        "Access-Control-Allow-Origin": "*",
                    },
                });
            }
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
    },
};

// Helper: Get color decimal for Discord embeds
function getColorForType(type) {
    switch (type) {
        case 'bug': return 0xef4444;       // Red
        case 'suggestion': return 0x8b5cf6; // Violet
        case 'question': return 0x3b82f6;   // Blue
        default: return 0x6b7280;           // Gray
    }
}
