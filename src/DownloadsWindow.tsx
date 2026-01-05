import { useState, useEffect } from 'react';
import { Download, X, FolderOpen, Play, Pause, Trash2, XCircle } from 'lucide-react';
import './index.css';

interface DownloadInfo {
    id: string;
    filename: string;
    path: string;
    totalBytes: number;
    receivedBytes: number;
    state: 'progressing' | 'completed' | 'cancelled' | 'interrupted' | 'paused';
    startTime: number;
    isPaused?: boolean;
    canResume?: boolean;
    speed?: number;
}

interface DownloadsData {
    active: DownloadInfo[];
    history: DownloadInfo[];
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatProgress(received: number, total: number): string {
    if (total === 0) return 'Calculating...';
    const percent = Math.round((received / total) * 100);
    return `${formatBytes(received)} / ${formatBytes(total)} (${percent}%)`;
}

function formatSpeed(bytesPerSecond: number | undefined): string {
    if (!bytesPerSecond || bytesPerSecond <= 0) return '';
    return `${formatBytes(bytesPerSecond)}/s`;
}

function getDateGroup(timestamp: number): string {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Reset times to midnight for comparison
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
        return 'Today';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return 'Yesterday';
    } else {
        // Format as "January 5, 2026"
        return date.toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
    }
}

interface GroupedDownloads {
    [dateGroup: string]: DownloadInfo[];
}

function groupDownloadsByDate(downloads: DownloadInfo[]): GroupedDownloads {
    const groups: GroupedDownloads = {};

    downloads.forEach(download => {
        const group = getDateGroup(download.startTime);
        if (!groups[group]) {
            groups[group] = [];
        }
        groups[group].push(download);
    });

    return groups;
}

export default function DownloadsWindow() {
    const [downloads, setDownloads] = useState<DownloadsData>({ active: [], history: [] });

    useEffect(() => {
        // Load initial downloads
        window.api.getDownloads().then((data: DownloadsData) => {
            setDownloads(data);
        });

        // Subscribe to updates
        const cleanup = window.api.onDownloadUpdate((data: unknown) => {
            setDownloads(data as DownloadsData);
        });

        // ESC key to close window
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                window.close();
            }
        };
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            cleanup();
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, []);

    const handleCancel = async (id: string) => {
        await window.api.cancelDownload(id);
    };

    const handlePause = async (id: string) => {
        await window.api.pauseDownload(id);
    };

    const handleResume = async (id: string) => {
        await window.api.resumeDownload(id);
    };

    const handleOpen = async (path: string) => {
        await window.api.openDownload(path);
    };

    const handleShowInFolder = (path: string) => {
        window.api.showDownloadInFolder(path);
    };

    const handleRemoveFromHistory = (id: string) => {
        window.api.removeDownloadFromHistory(id);
    };

    const handleClearHistory = () => {
        window.api.clearDownloadHistory();
    };

    const handleClose = () => {
        window.close();
    };

    const hasDownloads = downloads.active.length > 0 || downloads.history.length > 0;

    return (
        <div className="h-screen bg-[#1e1e1e] text-white flex flex-col">
            {/* Custom Title Bar */}
            <div className="h-8 bg-[#252526] flex items-center justify-between px-3 select-none" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
                <div className="flex items-center gap-2">
                    <Download size={14} className="text-violet-400" />
                    <span className="text-sm font-medium">Downloads</span>
                </div>
                <button
                    onClick={handleClose}
                    className="p-1 hover:bg-[#3e3e42] rounded transition-colors"
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                >
                    <X size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
                {/* Active Downloads */}
                {downloads.active.length > 0 && (
                    <div className="bg-[#252526] rounded-lg border border-[#3e3e42] overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-[#3e3e42] bg-[#2a2a2b]">
                            <h2 className="text-sm font-medium text-white">Active Downloads</h2>
                        </div>
                        <div className="divide-y divide-[#3e3e42]">
                            {downloads.active.map((download) => (
                                <div key={download.id} className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm text-white truncate flex-1 mr-2" title={download.filename}>
                                            {download.filename}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {/* Pause/Resume button */}
                                            {download.isPaused ? (
                                                <button
                                                    onClick={() => handleResume(download.id)}
                                                    disabled={!download.canResume}
                                                    className="p-1.5 text-gray-400 hover:text-green-400 hover:bg-[#3e3e42] rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title={download.canResume ? 'Resume' : 'Cannot resume'}
                                                >
                                                    <Play size={16} />
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handlePause(download.id)}
                                                    className="p-1.5 text-gray-400 hover:text-yellow-400 hover:bg-[#3e3e42] rounded transition-colors"
                                                    title="Pause"
                                                >
                                                    <Pause size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleCancel(download.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#3e3e42] rounded transition-colors"
                                                title="Cancel"
                                            >
                                                <XCircle size={16} />
                                            </button>
                                        </div>
                                    </div>
                                    {/* Progress bar */}
                                    <div className="h-2 bg-[#3e3e42] rounded-full overflow-hidden mb-1">
                                        <div
                                            className={`h-full transition-all duration-300 ${download.isPaused ? 'bg-yellow-500' : 'bg-gradient-to-r from-violet-500 to-purple-500'}`}
                                            style={{
                                                width: download.totalBytes > 0
                                                    ? `${(download.receivedBytes / download.totalBytes) * 100}%`
                                                    : '0%'
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-400">
                                        <span>
                                            {download.isPaused && <span className="text-yellow-400 mr-1">Paused</span>}
                                            {formatProgress(download.receivedBytes, download.totalBytes)}
                                        </span>
                                        {!download.isPaused && download.speed && download.speed > 0 && (
                                            <span className="text-violet-400">{formatSpeed(download.speed)}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Download History */}
                {downloads.history.length > 0 && (
                    <div className="bg-[#252526] rounded-lg border border-[#3e3e42] overflow-hidden">
                        <div className="px-4 py-2.5 border-b border-[#3e3e42] bg-[#2a2a2b] flex items-center justify-between">
                            <h2 className="text-sm font-medium text-white">Download History</h2>
                            <button
                                onClick={handleClearHistory}
                                className="text-xs text-gray-400 hover:text-red-400 transition-colors"
                            >
                                Clear All
                            </button>
                        </div>
                        <div>
                            {Object.entries(groupDownloadsByDate(downloads.history)).map(([dateGroup, groupDownloads]) => (
                                <div key={dateGroup}>
                                    {/* Date Group Header */}
                                    <div className="px-4 py-2 bg-[#1e1e1e] border-b border-[#3e3e42]">
                                        <span className="text-xs font-medium text-gray-500">{dateGroup}</span>
                                    </div>
                                    {/* Downloads in this group */}
                                    <div className="divide-y divide-[#3e3e42]">
                                        {groupDownloads.map((download) => (
                                            <div key={download.id} className="p-3 flex items-center gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-sm text-white truncate block" title={download.filename}>
                                                        {download.filename}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        {download.state === 'completed' && `${formatBytes(download.totalBytes)}`}
                                                        {download.state === 'cancelled' && 'Cancelled'}
                                                        {download.state === 'interrupted' && 'Failed'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    {download.state === 'completed' && (
                                                        <>
                                                            <button
                                                                onClick={() => handleOpen(download.path)}
                                                                className="p-1.5 text-gray-400 hover:text-violet-400 hover:bg-[#3e3e42] rounded transition-colors"
                                                                title="Open"
                                                            >
                                                                <Play size={14} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleShowInFolder(download.path)}
                                                                className="p-1.5 text-gray-400 hover:text-violet-400 hover:bg-[#3e3e42] rounded transition-colors"
                                                                title="Show in Folder"
                                                            >
                                                                <FolderOpen size={14} />
                                                            </button>
                                                        </>
                                                    )}
                                                    <button
                                                        onClick={() => handleRemoveFromHistory(download.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-[#3e3e42] rounded transition-colors"
                                                        title="Remove"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Empty State */}
                {!hasDownloads && (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Download size={48} className="text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-gray-400 mb-1">No downloads yet</h3>
                        <p className="text-sm text-gray-500">
                            Downloads will appear here when you<br />download files from websites.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}
