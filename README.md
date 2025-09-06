# Family Genealogy Website

A beautiful, interactive family genealogy website that displays family trees as organizational charts with search functionality.

## Features

- **Interactive Org Chart**: Professional organizational chart layout
- **Collapsible Tree**: Expand/collapse family branches
- **Search Functionality**: Find any person and reorganize the chart around them
- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Data**: Loads data from JSON files

## How to Run

### Option 1: Using the Batch File (Windows)
1. Double-click `start_server.bat`
2. Open your browser and go to `http://localhost:8000`

### Option 2: Using Python Command
1. Open terminal/command prompt in this directory
2. Run: `python server.py`
3. Open your browser and go to `http://localhost:8000`

## Usage

1. **View the Family Tree**: The chart starts collapsed showing only the root ancestor
2. **Expand Branches**: Click the `+` buttons to expand family branches
3. **Search for People**: Type a name in the search box to find and reorganize around that person
4. **Navigate**: Use the "Back to Full Tree" button to return to the complete genealogy

## Data Format

The website reads from `geneology.json`. The JSON structure should be:

```json
{
  "name": "Root Person",
  "children": [
    {
      "name": "Child 1",
      "children": [
        {
          "name": "Grandchild 1",
          "children": []
        }
      ]
    }
  ]
}
```

## Files

- `index.html` - Main website file
- `styles.css` - Styling and layout
- `script.js` - Interactive functionality
- `geneology.json` - Family tree data
- `server.py` - Local web server
- `start_server.bat` - Easy server startup (Windows)

## Requirements

- Python 3.x
- Modern web browser