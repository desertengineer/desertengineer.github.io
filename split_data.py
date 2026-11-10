#!/usr/bin/env python3
"""
Split and compress JSON data files for Bekeirat Software
Creates category-based files and compressed versions
"""

import json
import gzip
import os
import hashlib
from pathlib import Path

# Configuration
DATA_DIR = Path('/workspace/github__desertengineer__desertengineer.github.io/data')
CATEGORY_DIR = DATA_DIR / 'categories'
COMPRESSED_DIR = DATA_DIR / 'compressed'

# Ensure directories exist
CATEGORY_DIR.mkdir(exist_ok=True)
COMPRESSED_DIR.mkdir(exist_ok=True)

# Fields to keep (optimized for size)
ESSENTIAL_FIELDS = {
    'id', 'Title', 'title', 'Description', 'description', 
    'Category', 'category', 'Tags', 'tags', 'Image', 'thumb', 'thumbnail',
    'Play', 'play', 'Url', 'url', 'Class', 'class', 'classification'
}

def get_nested_value(obj, keys):
    """Get value from nested keys"""
    for key in keys:
        if key in obj:
            return obj[key]
    return None

def optimize_game(game):
    """Extract only essential fields and normalize"""
    optimized = {}
    
    # ID
    game_id = get_nested_value(game, ['id', 'Id'])
    optimized['id'] = game_id or f"game-{hashlib.md5(json.dumps(game).encode()).hexdigest()[:8]}"
    
    # Title
    title = get_nested_value(game, ['Title', 'title'])
    optimized['title'] = (title or "Untitled Game").strip()
    
    # Description
    desc = get_nested_value(game, ['Description', 'description'])
    optimized['description'] = (desc or "").strip()
    
    # Category
    cat = get_nested_value(game, ['Category', 'category'])
    optimized['category'] = (cat or "Unknown").strip()
    
    # Tags
    tags = get_nested_value(game, ['Tags', 'tags'])
    if isinstance(tags, str):
        optimized['tags'] = [t.strip().lower() for t in tags.split(',') if t.strip()]
    elif isinstance(tags, list):
        optimized['tags'] = [str(t).strip().lower() for t in tags if t]
    else:
        optimized['tags'] = []
    
    # Image/Thumbnail
    img = get_nested_value(game, ['Image', 'thumb', 'thumbnail', 'image'])
    optimized['thumb'] = img or 'https://placehold.co/400x400/12141f/00ffcc?text=Bekeirat+Game'
    
    # Play URL
    play_url = get_nested_value(game, ['Play', 'play', 'Url', 'url', 'gameUrl'])
    optimized['play'] = play_url or ''
    
    # Classification (for filtering)
    classification = get_nested_value(game, ['Class', 'class', 'classification', 'Classification'])
    if classification:
        optimized['classification'] = str(classification).strip()
    
    return optimized

def split_by_category(data, output_dir):
    """Split games by category"""
    categories = {}
    
    for game in data:
        cat = (game.get('Category') or game.get('category') or 'Unknown').strip()
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(game)
    
    # Save each category
    for cat, games in categories.items():
        safe_cat = cat.replace('/', '_').replace('\\', '_').replace(' ', '_')
        output_path = output_dir / f'{safe_cat}.json'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(games, f, ensure_ascii=False, indent=None, separators=(',', ':'))
        
        print(f'  Created: {output_path} ({len(games)} games)')
    
    return categories

def create_optimized_category_files(data, output_dir):
    """Create optimized category files with only essential fields"""
    categories = {}
    
    for game in data:
        optimized = optimize_game(game)
        cat = optimized['category']
        if cat not in categories:
            categories[cat] = []
        categories[cat].append(optimized)
    
    # Save optimized files
    for cat, games in categories.items():
        safe_cat = cat.replace('/', '_').replace('\\', '_').replace(' ', '_')
        output_path = output_dir / f'{safe_cat}_optimized.json'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(games, f, ensure_ascii=False, indent=None, separators=(',', ':'))
        
        # Create compressed version
        compressed_path = output_dir / f'{safe_cat}_optimized.json.gz'
        with open(output_path, 'rb') as f_in:
            with gzip.open(compressed_path, 'wb') as f_out:
                f_out.write(f_in.read())
        
        orig_size = output_path.stat().st_size
        comp_size = compressed_path.stat().st_size
        ratio = (1 - comp_size/orig_size) * 100
        
        print(f'  {safe_cat}: {len(games)} games, {orig_size/1024:.1f}KB -> {comp_size/1024:.1f}KB ({ratio:.1f}% reduction)')
    
    return categories

def create_category_index(data, output_dir):
    """Create an index file with category listings"""
    categories = {}
    
    for game in data:
        cat = (game.get('Category') or game.get('category') or 'Unknown').strip()
        if cat not in categories:
            categories[cat] = {
                'name': cat,
                'count': 0,
                'file': f'{cat.replace(" ", "_")}.json'
            }
        categories[cat]['count'] += 1
    
    index_data = {
        'categories': list(categories.values()),
        'total_games': len(data),
        'generated': True
    }
    
    with open(output_dir / 'index.json', 'w', encoding='utf-8') as f:
        json.dump(index_data, f, ensure_ascii=False, indent=2)
    
    # Compressed version
    with open(output_dir / 'index.json', 'rb') as f_in:
        with gzip.open(output_dir / 'index.json.gz', 'wb') as f_out:
            f_out.write(f_in.read())
    
    print(f'  Created category index: {len(categories)} categories, {len(data)} total games')

def compress_existing_files(data_dir):
    """Compress all existing JSON files"""
    compressed_count = 0
    total_original = 0
    total_compressed = 0
    
    for json_file in data_dir.glob('*.json'):
        if json_file.name.endswith('_optimized.json'):
            continue
            
        compressed_file = data_dir / f'{json_file.name}.gz'
        
        with open(json_file, 'rb') as f_in:
            content = f_in.read()
            total_original += len(content)
            
            with gzip.open(compressed_file, 'wb') as f_out:
                f_out.write(content)
            
            total_compressed += compressed_file.stat().st_size
            compressed_count += 1
        
        print(f'  Compressed: {json_file.name} ({len(content)/1024:.1f}KB -> {compressed_file.stat().st_size/1024:.1f}KB)')
    
    if compressed_count > 0:
        ratio = (1 - total_compressed/total_original) * 100
        print(f'\n  Total: {compressed_count} files compressed')
        print(f'  Original: {total_original/1024/1024:.2f}MB -> Compressed: {total_compressed/1024/1024:.2f}MB ({ratio:.1f}% reduction)')

def main():
    print("=" * 60)
    print("Bekeirat Software - Data Optimization")
    print("=" * 60)
    
    # Process all.json first (the big one)
    all_json_path = DATA_DIR / 'all.json'
    if all_json_path.exists():
        print(f'\nProcessing {all_json_path.name}...')
        with open(all_json_path, 'r', encoding='utf-8') as f:
            all_data = json.load(f)
        
        print(f'  Total games: {len(all_data)}')
        
        # Create category-based files
        print('\n  Creating category files...')
        split_by_category(all_data, CATEGORY_DIR)
        
        # Create optimized category files
        print('\n  Creating optimized category files...')
        create_optimized_category_files(all_data, CATEGORY_DIR)
        
        # Create index
        print('\n  Creating category index...')
        create_category_index(all_data, CATEGORY_DIR)
    
    # Compress existing files
    print('\nCompressing existing JSON files...')
    compress_existing_files(DATA_DIR)
    compress_existing_files(CATEGORY_DIR)
    
    # Process daily files
    print('\nProcessing daily files...')
    for i in range(1, 8):
        daily_path = DATA_DIR / f'all_{i}.json'
        if daily_path.exists():
            print(f'\n  Processing all_{i}.json...')
            with open(daily_path, 'r', encoding='utf-8') as f:
                daily_data = json.load(f)
            
            print(f'    Games: {len(daily_data)}')
            
            # Create optimized version
            optimized = [optimize_game(g) for g in daily_data]
            optimized_path = DATA_DIR / f'all_{i}_optimized.json'
            
            with open(optimized_path, 'w', encoding='utf-8') as f:
                json.dump(optimized, f, ensure_ascii=False, indent=None, separators=(',', ':'))
            
            # Compress
            with open(optimized_path, 'rb') as f_in:
                with gzip.open(DATA_DIR / f'all_{i}_optimized.json.gz', 'wb') as f_out:
                    f_out.write(f_in.read())
            
            orig_size = daily_path.stat().st_size
            opt_size = optimized_path.stat().st_size
            comp_size = (DATA_DIR / f'all_{i}_optimized.json.gz').stat().st_size
            
            print(f'    Original: {orig_size/1024:.1f}KB -> Optimized: {opt_size/1024:.1f}KB -> Compressed: {comp_size/1024:.1f}KB')
    
    print('\n' + '=' * 60)
    print('Optimization Complete!')
    print('=' * 60)

if __name__ == '__main__':
    main()
