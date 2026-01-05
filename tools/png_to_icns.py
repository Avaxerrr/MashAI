#!/usr/bin/env python3
"""
PNG to ICNS Converter
Creates a multi-resolution .icns file from a source PNG.

Usage:
    python png_to_icns.py <input.png> [output.icns]

If output is not specified, it will be named the same as input with .icns extension.
"""

import sys
import os
from pathlib import Path
from PIL import Image
import icnsutil
import tempfile
import shutil

# macOS icon types and their sizes
# Format: (type_key, size, description)
ICON_TYPES = [
    ('icp4', 16, '16x16'),
    ('icp5', 32, '32x32'),
    ('icp6', 64, '64x64'),
    ('ic07', 128, '128x128'),
    ('ic08', 256, '256x256'),
    ('ic09', 512, '512x512'),
    ('ic10', 1024, '1024x1024 (512@2x)'),
]


def create_icns(input_path: str, output_path: str = None) -> str:
    """
    Convert a PNG to a multi-resolution ICNS file.
    
    Args:
        input_path: Path to source PNG (ideally 1024x1024 or larger)
        output_path: Path for output .icns file (optional)
    
    Returns:
        Path to created .icns file
    """
    input_path = Path(input_path)
    
    if not input_path.exists():
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    if output_path is None:
        output_path = input_path.with_suffix('.icns')
    else:
        output_path = Path(output_path)
    
    # Load source image
    print(f"Loading: {input_path}")
    source_img = Image.open(input_path)
    
    # Ensure RGBA mode for transparency support
    if source_img.mode != 'RGBA':
        source_img = source_img.convert('RGBA')
    
    original_size = source_img.size
    print(f"Source size: {original_size[0]}x{original_size[1]}")
    
    if original_size[0] < 512 or original_size[1] < 512:
        print("Warning: Source image is smaller than 512x512. Quality may be reduced.")
    
    # Create temp directory for resized images
    temp_dir = Path(tempfile.mkdtemp())
    
    try:
        # Create ICNS file
        icns = icnsutil.IcnsFile()
        
        # Generate each size
        sizes_added = []
        for type_key, size, desc in ICON_TYPES:
            if size <= max(original_size):
                # Resize with high-quality resampling
                resized = source_img.resize((size, size), Image.Resampling.LANCZOS)
                
                # Save to temp file
                temp_png = temp_dir / f"icon_{size}x{size}.png"
                resized.save(temp_png, format='PNG')
                
                # Add to ICNS with explicit type key
                icns.add_media(key=type_key, file=str(temp_png))
                sizes_added.append(desc)
                print(f"  Added: {type_key} ({desc})")
        
        # Save the ICNS file
        icns.write(str(output_path))
        print(f"\nCreated: {output_path}")
        print(f"Total sizes: {len(sizes_added)}")
        
        # Show file size
        file_size = output_path.stat().st_size
        print(f"File size: {file_size / 1024:.1f} KB")
        
        return str(output_path)
    
    finally:
        # Clean up temp directory
        shutil.rmtree(temp_dir, ignore_errors=True)


def inspect_icns(icns_path: str) -> None:
    """
    Inspect an existing ICNS file and show what sizes it contains.
    """
    icns_path = Path(icns_path)
    
    if not icns_path.exists():
        raise FileNotFoundError(f"File not found: {icns_path}")
    
    print(f"\nInspecting: {icns_path}")
    print("-" * 40)
    
    icns = icnsutil.IcnsFile(str(icns_path))
    
    # Type descriptions
    type_info = {
        'icp4': '16x16',
        'icp5': '32x32', 
        'icp6': '64x64',
        'ic07': '128x128',
        'ic08': '256x256',
        'ic09': '512x512',
        'ic10': '1024x1024 (512@2x)',
        'ic11': '32x32 (16@2x)',
        'ic12': '64x64 (32@2x)',
        'ic13': '256x256 (128@2x)',
        'ic14': '512x512 (256@2x)',
    }
    
    for key, data in icns.media.items():
        desc = type_info.get(key, 'unknown')
        print(f"  {key}: {desc} - {len(data)} bytes")
    
    print("-" * 40)
    print(f"Total entries: {len(icns.media)}")


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(__doc__)
        print("\nExample:")
        print("  python png_to_icns.py ../src/assets/MashAI-logo.png")
        print("  python png_to_icns.py input.png output.icns")
        print("\nTo inspect an existing .icns file:")
        print("  python png_to_icns.py --inspect file.icns")
        sys.exit(1)
    
    if sys.argv[1] == '--inspect':
        if len(sys.argv) < 3:
            print("Error: Please provide an .icns file to inspect")
            sys.exit(1)
        inspect_icns(sys.argv[2])
    else:
        input_file = sys.argv[1]
        output_file = sys.argv[2] if len(sys.argv) > 2 else None
        
        try:
            create_icns(input_file, output_file)
        except Exception as e:
            print(f"Error: {e}")
            sys.exit(1)
