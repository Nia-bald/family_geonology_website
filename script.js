class GenealogyTree {
    constructor() {
        this.originalData = null;
        this.data = null; // Current data being displayed
        this.searchResults = [];
        this.highlightedNodes = new Set();
        this.collapsedNodes = new Set(); // Track which nodes are collapsed
        this.isSearchView = false; // Track if we're in search view
        this.currentNodePath = []; // Track the path to current node for navigation
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.initializeCollapsedState(); // Set all nodes to collapsed by default
            this.renderTree();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing genealogy tree:', error);
            this.showError('Failed to load genealogy data. Please make sure the server is running.');
        }
    }

    async loadData() {
        try {
            // const response = await fetch('/geneology.json');
            // if (!response.ok) {
            //     throw new Error(`HTTP error! status: ${response.status}`);
            // }
            // Use the local geneology_json variable instead of fetching from file
            this.originalData = GenealogyData.data;
            this.addIsHiddenProperty(this.originalData);
            this.data = this.originalData;
        } catch (error) {
            console.error('Error loading data:', error);
            throw error;
        }
    }

    addIsHiddenProperty(node) {
        node.isHidden = false;
        if (node.children) {
            node.children.forEach(child => this.addIsHiddenProperty(child));
        }
    }

    initializeCollapsedState() {
        // Recursively add all nodes with children to collapsed state, except root
        this.addAllNodesToCollapsed(this.data, true);
    }

    addAllNodesToCollapsed(node, isRoot = false) {
        if (node.children && node.children.length > 0) {
            // Don't collapse the root node - keep its children visible by default
            if (!isRoot) {
                this.collapsedNodes.add(node.name);
            }
            node.children.forEach(child => {
                this.addAllNodesToCollapsed(child, false);
            });
        }
    }

    findNodeByName(rootNode, targetName) {
        if (rootNode.name.toLowerCase() === targetName.toLowerCase()) {
            return rootNode;
        }

        if (rootNode.children) {
            for (let child of rootNode.children) {
                const found = this.findNodeByName(child, targetName);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    findNodeWithPath(rootNode, targetName, currentPath = []) {
        const newPath = [...currentPath, rootNode.name];

        if (rootNode.name.toLowerCase() === targetName.toLowerCase()) {
            return { node: rootNode, path: newPath };
        }

        if (rootNode.children) {
            for (let child of rootNode.children) {
                const found = this.findNodeWithPath(child, targetName, newPath);
                if (found) {
                    return found;
                }
            }
        }

        return null;
    }

    findParentNode(rootNode, targetName) {
        if (rootNode.children) {
            for (let child of rootNode.children) {
                if (child.name.toLowerCase() === targetName.toLowerCase()) {
                    return rootNode;
                }
                const found = this.findParentNode(child, targetName);
                if (found) {
                    return found;
                }
            }
        }
        return null;
    }

    countTotalDescendants(node) {
        if (!node.children || node.children.length === 0) {
            return 0;
        }

        let totalCount = node.children.length;
        for (let child of node.children) {
            totalCount += this.countTotalDescendants(child);
        }

        return totalCount;
    }

    reorganizeTreeForSearch(targetName) {
        const foundResult = this.findNodeWithPath(this.originalData, targetName);
        if (foundResult) {
            const foundNode = foundResult.node;
            const path = foundResult.path;

            // Create a new root node with the found person as the root
            this.data = {
                name: foundNode.name,
                children: foundNode.children || []
            };
            this.isSearchView = true;
            this.currentNodePath = path;

            // Reset collapsed state for the new tree
            this.collapsedNodes.clear();
            this.initializeCollapsedState();

            // Re-render the tree
            this.renderTree();

            // Show navigation buttons
            this.showNavigationButtons();

            return true;
        }
        return false;
    }

    returnToOriginalView() {
        this.data = this.originalData;
        this.isSearchView = false;
        this.currentNodePath = [];

        // Reset collapsed state
        this.collapsedNodes.clear();
        this.initializeCollapsedState();

        // Re-render the tree
        this.renderTree();

        // Hide navigation buttons
        this.hideNavigationButtons();
    }

    navigateUpOneGeneration() {
        if (this.currentNodePath.length <= 1) {
            // Already at the top, return to original view
            this.returnToOriginalView();
            return;
        }

        // Get the parent node name (second to last in path)
        const parentName = this.currentNodePath[this.currentNodePath.length - 2];

        // Reorganize to show the parent as root
        this.reorganizeTreeForSearch(parentName);
    }


    renderTree() {
        const container = document.getElementById('treeContainer');
        container.innerHTML = '';

        if (this.data) {
            const orgChart = this.createOrgChart(this.data);
            container.appendChild(orgChart);
        }
    }

    createOrgChart(rootNode) {
        const orgChartDiv = document.createElement('div');
        orgChartDiv.className = 'org-chart';

        // Create levels array to organize nodes by depth
        const levels = [];
        this.organizeNodesByLevel(rootNode, levels, 0);

        // Create each level
        levels.forEach((levelNodes, levelIndex) => {
            const levelDiv = document.createElement('div');
            levelDiv.className = 'level';

            levelNodes.forEach(nodeData => {
                if (nodeData.node.isHidden) return;
                const nodeElement = this.createOrgNode(nodeData.node, nodeData.level);
                levelDiv.appendChild(nodeElement);
            });

            orgChartDiv.appendChild(levelDiv);
        });

        return orgChartDiv;
    }

    organizeNodesByLevel(node, levels, currentLevel) {
        // Initialize level if it doesn't exist
        if (!levels[currentLevel]) {
            levels[currentLevel] = [];
        }

        // Add current node to its level
        levels[currentLevel].push({
            node: node,
            level: currentLevel
        });

        // Process children if they exist and parent is not collapsed
        if (node.children && node.children.length > 0 && !this.collapsedNodes.has(node.name)) {
            node.children.forEach(child => {
                this.organizeNodesByLevel(child, levels, currentLevel + 1);
            });
        }
    }

    createOrgNode(node, level) {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'org-node';
        nodeDiv.setAttribute('data-level', level);
        nodeDiv.setAttribute('data-name', node.name.toLowerCase());

        const hasChildren = node.children && node.children.length > 0;

        // Create the node box
        const nodeBox = document.createElement('div');
        nodeBox.className = 'node-box';
        nodeBox.setAttribute('data-name', node.name);

        // Toggle button
        if (hasChildren) {
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'toggle-btn';
            const isCollapsed = this.collapsedNodes.has(node.name);
            toggleBtn.textContent = isCollapsed ? '+' : '−';
            if (!isCollapsed) {
                toggleBtn.classList.add('expanded');
            }
            toggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleOrgNode(node.name);
            });
            nodeBox.appendChild(toggleBtn);
        }

        // Node name
        const nameDiv = document.createElement('div');
        nameDiv.className = 'node-name';
        nameDiv.textContent = node.name;
        nodeBox.appendChild(nameDiv);

        // Node title (generation level)
        const titleDiv = document.createElement('div');
        titleDiv.className = 'node-title';
        titleDiv.textContent = `Generation ${level + 1}`;
        nodeBox.appendChild(titleDiv);

        // Total descendants count
        const descendantsCountDiv = document.createElement('div');
        descendantsCountDiv.className = 'children-count';
        const totalDescendants = this.countTotalDescendants(node);
        descendantsCountDiv.textContent = `${totalDescendants} descendant${totalDescendants !== 1 ? 's' : ''}`;
        nodeBox.appendChild(descendantsCountDiv);

        // Add click event to focus on the node
        nodeBox.addEventListener('click', (e) => {
            // Don't focus if clicking on the toggle button
            if (e.target.classList.contains('toggle-btn')) {
                return;
            }
            console.log('Focusing on node:', node.name);
            this.focusOnNode(node.name);
        });

        nodeDiv.appendChild(nodeBox);

        return nodeDiv;
    }

    toggleOrgNode(nodeName) {
        if (this.collapsedNodes.has(nodeName)) {
            // Expand the node
            this.collapsedNodes.delete(nodeName);

            // Hide siblings when expanding
            this.hideSiblings(nodeName);
        } else {
            // Collapse the node
            this.collapsedNodes.add(nodeName);
            this.unhideSiblings(nodeName);
        }

        // Re-render the tree with updated state
        this.renderTree();
    }

    hideSiblings(nodeName) {
        // Find the parent of the expanded node in the current data
        const parent = this.findParentNode(this.data, nodeName);
        if (parent && parent.children) {
            // Add all siblings to collapsed state
            parent.children.forEach(child => {
                if (child.name !== nodeName) {
                    this.collapsedNodes.add(child.name);
                    child.isHidden = true;
                }
            });
        }
    }

    unhideSiblings(nodeName) {
        const parent = this.findParentNode(this.data, nodeName);
        if (parent && parent.children) {
            parent.children.forEach(child => {
                if (child.name !== nodeName) {
                    child.isHidden = false;
                }
            });
        }
    }

    focusOnNode(nodeName) {
        console.log('focusOnNode called with:', nodeName);
        // Find the node in the original data
        const foundNode = this.findNodeByName(this.originalData, nodeName);
        console.log('Found node:', foundNode);
        if (foundNode) {
            // Reorganize tree to show the clicked node as root
            console.log('Reorganizing tree for:', nodeName);
            this.reorganizeTreeForSearch(nodeName);
        } else {
            console.log('Node not found:', nodeName);
        }
    }

    highlightOrgNode(nodeBox) {
        // Remove previous highlights
        this.highlightedNodes.forEach(node => {
            node.classList.remove('highlighted');
        });
        this.highlightedNodes.clear();

        // Add highlight to current node
        nodeBox.classList.add('highlighted');
        this.highlightedNodes.add(nodeBox);

        // Scroll to the highlighted node
        nodeBox.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });

        // Remove highlight after 3 seconds
        setTimeout(() => {
            nodeBox.classList.remove('highlighted');
            this.highlightedNodes.delete(nodeBox);
        }, 3000);
    }

    search(query) {
        if (!query.trim()) {
            this.clearSearch();
            return;
        }

        const searchTerm = query.toLowerCase().trim();

        // First try to find an exact match and reorganize immediately
        const exactMatch = this.findNodeByName(this.originalData, searchTerm);
        if (exactMatch) {
            this.reorganizeTreeForSearch(exactMatch.name);
            document.getElementById('searchResults').classList.remove('show');
            return;
        }

        // Try to find partial matches and reorganize if only one match
        const results = [];
        this.searchInNode(this.originalData, searchTerm, results, []);

        if (results.length === 1) {
            // If only one result, reorganize immediately
            this.reorganizeTreeForSearch(results[0].name);
            document.getElementById('searchResults').classList.remove('show');
        } else {
            // Multiple results, show search results
            this.displaySearchResults(results, searchTerm);
        }
    }

    searchInNode(node, searchTerm, results, path) {
        const currentPath = [...path, node.name];

        if (node.name.toLowerCase().includes(searchTerm)) {
            results.push({
                name: node.name,
                path: currentPath,
                level: currentPath.length - 1
            });
        }

        if (node.children) {
            node.children.forEach(child => {
                this.searchInNode(child, searchTerm, results, currentPath);
            });
        }
    }

    displaySearchResults(results, searchTerm) {
        const resultsContainer = document.getElementById('searchResults');

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <h3>Search Results for "${searchTerm}"</h3>
                <div class="no-results">No results found</div>
            `;
        } else {
            let html = `<h3>Search Results for "${searchTerm}" (${results.length} found)</h3>`;

            results.forEach(result => {
                const pathString = result.path.join(' → ');
                html += `
                    <div class="search-result-item" data-path="${result.path.join(',')}">
                        <strong>${result.name}</strong><br>
                        <small>Path: ${pathString}</small>
                    </div>
                `;
            });

            resultsContainer.innerHTML = html;

            // Add click events to search results
            resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const path = item.getAttribute('data-path').split(',');
                    this.highlightNodeByPath(path);
                });
            });
        }

        resultsContainer.classList.add('show');
    }

    highlightNodeByPath(path) {
        const targetName = path[path.length - 1];

        // Reorganize tree to show the searched person as root
        if (this.reorganizeTreeForSearch(targetName)) {
            // Hide search results
            document.getElementById('searchResults').classList.remove('show');

            // Highlight the new root node
            setTimeout(() => {
                const nodeBox = document.querySelector(`.node-box[data-name="${targetName}"]`);
                if (nodeBox) {
                    this.highlightOrgNode(nodeBox);
                }
            }, 100);
        }
    }

    showNavigationButtons() {
        const searchContainer = document.querySelector('.search-container');

        // Create back to full tree button
        let backBtn = document.getElementById('backBtn');
        if (!backBtn) {
            backBtn = document.createElement('button');
            backBtn.id = 'backBtn';
            backBtn.textContent = '← Back to Full Tree';
            backBtn.style.marginLeft = '10px';
            backBtn.style.background = '#e53e3e';
            backBtn.style.color = 'white';
            backBtn.addEventListener('click', () => {
                this.returnToOriginalView();
            });
            searchContainer.appendChild(backBtn);
        }

        // Create up one generation button
        let upBtn = document.getElementById('upBtn');
        if (!upBtn) {
            upBtn = document.createElement('button');
            upBtn.id = 'upBtn';
            upBtn.textContent = '↑ Go Up One Generation';
            upBtn.style.marginLeft = '10px';
            upBtn.style.background = '#38a169';
            upBtn.style.color = 'white';
            upBtn.addEventListener('click', () => {
                this.navigateUpOneGeneration();
            });
            searchContainer.appendChild(upBtn);
        }

        // Show both buttons
        backBtn.style.display = 'inline-block';
        upBtn.style.display = 'inline-block';

        // Update up button text based on current position
        if (this.currentNodePath.length <= 1) {
            upBtn.textContent = '↑ Back to Full Tree';
        } else {
            const parentName = this.currentNodePath[this.currentNodePath.length - 2];
            upBtn.textContent = `↑ Go to ${parentName}`;
        }
    }

    hideNavigationButtons() {
        const backBtn = document.getElementById('backBtn');
        const upBtn = document.getElementById('upBtn');

        if (backBtn) {
            backBtn.style.display = 'none';
        }
        if (upBtn) {
            upBtn.style.display = 'none';
        }
    }

    clearSearch() {
        document.getElementById('searchResults').classList.remove('show');
        document.getElementById('searchInput').value = '';

        // Return to original view if we're in search view
        if (this.isSearchView) {
            this.returnToOriginalView();
        }

        // Remove any highlights
        this.highlightedNodes.forEach(node => {
            node.classList.remove('highlighted');
        });
        this.highlightedNodes.clear();
    }

    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const clearBtn = document.getElementById('clearBtn');

        searchBtn.addEventListener('click', () => {
            const query = searchInput.value;
            this.search(query);
        });

        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const query = searchInput.value;
                this.search(query);
            }
        });

        clearBtn.addEventListener('click', () => {
            this.clearSearch();
        });

        // Real-time search as user types
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value;
            if (query.length >= 2) {
                this.search(query);
            } else if (query.length === 0) {
                this.clearSearch();
            }
        });
    }

    showError(message) {
        const container = document.getElementById('treeContainer');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #e53e3e;">
                <h3>Error</h3>
                <p>${message}</p>
            </div>
        `;
    }
}

// Initialize the genealogy tree when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GenealogyTree();
});


class GenealogyData {
    static data = {
        "name": "Tani",
        "children": [
            {
                "name": "Nisi",
                "children": [
                    {
                        "name": "Sidum",
                        "children": [
                            {
                                "name": "Dumde",
                                "children": [
                                    {
                                        "name": "De",
                                        "children": [
                                            {
                                                "name": "Eyu",
                                                "children": [
                                                    {
                                                        "name": "Yubo",
                                                        "children": [
                                                            {
                                                                "name": "Boji",
                                                                "children": [
                                                                    {
                                                                        "name": "Jini"
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                "name": "Bore",
                                                                "children": [
                                                                    {
                                                                        "name": "Reyu",
                                                                        "children": [
                                                                            {
                                                                                "name": "Yumen",
                                                                                "children": [
                                                                                    {
                                                                                        "name": "Menpe",
                                                                                        "children": [
                                                                                            {
                                                                                                "name": "Peke",
                                                                                                "children": [
                                                                                                    {
                                                                                                        "name": "Ketu",
                                                                                                        "children": [
                                                                                                            {
                                                                                                                "name": "Tudo",
                                                                                                                "children": [
                                                                                                                    {
                                                                                                                        "name": "Doyom",
                                                                                                                        "children": [
                                                                                                                            {
                                                                                                                                "name": "Yomba",
                                                                                                                                "children": [{
                                                                                                                                    "name": "Bajar",
                                                                                                                                    "children": [
                                                                                                                                        {
                                                                                                                                            "name": "Jargo",
                                                                                                                                            "children": [
                                                                                                                                                {
                                                                                                                                                    "name": "Gola",
                                                                                                                                                    "children": [
                                                                                                                                                        {
                                                                                                                                                            "name": "Lani",
                                                                                                                                                            "children": [
                                                                                                                                                                {
                                                                                                                                                                    "name": "Nido",
                                                                                                                                                                    "children": [
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Dokar",
                                                                                                                                                                            "children": [
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Karji",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Jini",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Niyu",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yujen",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jento",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Tommin",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Tommsi",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Tomkin",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Tombin",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jenkar",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yure",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Retu",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Tumo",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yuge",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gemir",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yuten",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yui",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yunga",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yupe",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Nibi",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bijar",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jarni",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jarko",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Kokar",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bimar",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Marli",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bigom",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gomdam",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gomjum",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Biluk",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Jiyi",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Yimik",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Mikjum",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumyi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumyir",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Mikbom",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bommi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bompu",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Yicha",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Chaluk",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Lukar",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Lukter",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Luksak",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Chade",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Demo",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Deken",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Jigi",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Gimen",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Menba",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Banga",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Baki",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Mentu",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Menpe",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Pekar",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Mennu",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Meni",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Mendem",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                },
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Kargu",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Gukup",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kupmar",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marpak",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Pakni",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Nison",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Paknga",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Ngaki",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Paktu",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Tuni",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marluk",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Lukbi",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Bigam",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Lukpu",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Margu",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gutum",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gumen",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marpa",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Person",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Pamir",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Panya",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Nyarun",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marjum",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumbo",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Boson",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marnia",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Niamij",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Niare",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marpi",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kupji",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jige",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gebom",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Geyom",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gejom",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Gemin",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jila",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Gujen",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Jenpe",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Pebom",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bomkar",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Pedul",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Dulken",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Dulsom",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Dulsen",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Penga",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Guchi",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Chikar",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Kargu",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Karken",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Chigo",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Goto",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Gopok",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Pokno",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Golen",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Gopu",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Gona",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                }
                                                                                                                                                                            ]
                                                                                                                                                                        },
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Dori",
                                                                                                                                                                            "children": []
                                                                                                                                                                        },
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Doni",
                                                                                                                                                                            "children": [
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Nibin",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Binto",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Tori",
                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Toba",
                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                }
                                                                                                                                                                            ]
                                                                                                                                                                        }
                                                                                                                                                                    ]
                                                                                                                                                                }
                                                                                                                                                            ]
                                                                                                                                                        },
                                                                                                                                                        {
                                                                                                                                                            "name": "Lamar",
                                                                                                                                                            "children": [
                                                                                                                                                                {
                                                                                                                                                                    "name": "Marjum",
                                                                                                                                                                    "children": [
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Jumngu",
                                                                                                                                                                            "children": [
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Ngutum",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Tumki",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kiji",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jitum",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Tumi",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Imi",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Iku",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Tumbe",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Tumnga",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jijum",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumpe",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumbi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumken",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kiyum",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yummar",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Maryi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Marbom",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Marli",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Marjum",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Jumbo",
                                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                                {
                                                                                                                                                                                                                                    "name": "Boson",
                                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                            ]
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumi",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Icha",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Iba",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumjum",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumge",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumnya",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumpe",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Tumpak",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Pakjen",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jenkir",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kirji",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Jijip",
                                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                                {
                                                                                                                                                                                                                                    "name": "Jippe",
                                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                                },
                                                                                                                                                                                                                                {
                                                                                                                                                                                                                                    "name": "Jipbai",
                                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                            ]
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kirba",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Bape",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Baka",
                                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                                {
                                                                                                                                                                                                                                    "name": "Kali",
                                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                                }
                                                                                                                                                                                                                            ]
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jenyu",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Yujum",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Jumli",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Jummo",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jennga",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Paktum",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Tumka",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kanu",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kato",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Tumluk",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Lukme",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Luknya",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Pakcho",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Choba",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Baka",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Kali",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Chopok",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Pokram",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Rambo",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Rampu",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Pokto",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Pokbi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Pakyum",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumjar",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jarter",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Ternyi",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        },
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Terge",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jarbom",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jarka",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jarsak",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumka",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kapak",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumjuk",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jukgam",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumnya",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Nyato",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumbi",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bido",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Binyak",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bge",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumi",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Tumme",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Meyom",
                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Tumgo",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Gopi",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Pinga",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Ngabi",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Bijhon",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Pikar",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kartum",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Karpik",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Godu",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Dubom",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bombai",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bomjon",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Duli",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Lisa",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Lijum",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                },
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Nguchi",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Chijuk",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Jukbi",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bichi",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Chibom",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Chimo",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Moge",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bikar",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Karno",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Karmesh",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Chipek",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Pekjum",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jumrik",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Rikson",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jumesh",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jumter",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Pekko",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Koyor",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Kobi",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Kono",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                }
                                                                                                                                                                            ]
                                                                                                                                                                        },
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Jumkir",
                                                                                                                                                                            "children": [
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Kiryi",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Yimi",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Mito",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Toba",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Tojen",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jento",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jenbi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Tochi",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Chito",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Chingam",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Toyi",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Yirak",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Rakjum",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jumkir",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Rakyum",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumi",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Idar",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yumgam",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                }
                                                                                                                                                                            ]
                                                                                                                                                                        }
                                                                                                                                                                    ]
                                                                                                                                                                }
                                                                                                                                                            ]
                                                                                                                                                        },
                                                                                                                                                        {
                                                                                                                                                            "name": "Lakom",
                                                                                                                                                            "children": [
                                                                                                                                                                {
                                                                                                                                                                    "name": "Komrak",
                                                                                                                                                                    "children": [
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Raklen",
                                                                                                                                                                            "children": [
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Lenke",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Kekar",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Karjar",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jardik",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Dikpe",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jarken",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kenyi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Kenba",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jartum",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Tumken",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Tumrik",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Tumli",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Karbom",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bomnya",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Nyabi",
                                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                                        {
                                                                                                                                                                                                                            "name": "Bigam",
                                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                                        }
                                                                                                                                                                                                                    ]
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Nyato",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bomjum",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Jumkum",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                },
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Lenpen",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Pengo",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Goya",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yari",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Ribi",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                },
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Riba",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                }
                                                                                                                                                                            ]
                                                                                                                                                                        }
                                                                                                                                                                    ]
                                                                                                                                                                }
                                                                                                                                                            ]
                                                                                                                                                        }
                                                                                                                                                    ]
                                                                                                                                                }
                                                                                                                                            ]
                                                                                                                                        },
                                                                                                                                        {
                                                                                                                                            "name": "Jarba",
                                                                                                                                            "children": [
                                                                                                                                                {
                                                                                                                                                    "name": "Bajar",
                                                                                                                                                    "children": [
                                                                                                                                                        {
                                                                                                                                                            "name": "Jarba",
                                                                                                                                                            "children": [
                                                                                                                                                                {
                                                                                                                                                                    "name": "Baki",
                                                                                                                                                                    "children": [
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Kika",
                                                                                                                                                                            "children": [
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Kai",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Ijum",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Jumchi",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Chili",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Chikul",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Jummar",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marjum",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Marge",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                }
                                                                                                                                                                            ]
                                                                                                                                                                        },
                                                                                                                                                                        {
                                                                                                                                                                            "name": "Kirak",
                                                                                                                                                                            "children": [
                                                                                                                                                                                {
                                                                                                                                                                                    "name": "Rakrik",
                                                                                                                                                                                    "children": [
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Rikbi",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Bigo",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Goto",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Tomar",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Bijir",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jirdam",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Damson",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Jirbom",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Bigu",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Gubin",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Binya",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Nyatu",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Rikma",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Marik",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Rikmi",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Rikjom",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Mayom",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Yombom",
                                                                                                                                                                                                            "children": [
                                                                                                                                                                                                                {
                                                                                                                                                                                                                    "name": "Bomnu",
                                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                                }
                                                                                                                                                                                                            ]
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        },
                                                                                                                                                                                        {
                                                                                                                                                                                            "name": "Rikken",
                                                                                                                                                                                            "children": [
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kenli",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Linn",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Lio",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kenba",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bapu",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Bamin",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kenrik",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Rikluk",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        },
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Riknu",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kenpe",
                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Kenter",
                                                                                                                                                                                                    "children": []
                                                                                                                                                                                                },
                                                                                                                                                                                                {
                                                                                                                                                                                                    "name": "Keni",
                                                                                                                                                                                                    "children": [
                                                                                                                                                                                                        {
                                                                                                                                                                                                            "name": "Ige",
                                                                                                                                                                                                            "children": []
                                                                                                                                                                                                        }
                                                                                                                                                                                                    ]
                                                                                                                                                                                                }
                                                                                                                                                                                            ]
                                                                                                                                                                                        }
                                                                                                                                                                                    ]
                                                                                                                                                                                }
                                                                                                                                                                            ]
                                                                                                                                                                        }
                                                                                                                                                                    ]
                                                                                                                                                                }
                                                                                                                                                            ]
                                                                                                                                                        }
                                                                                                                                                    ]
                                                                                                                                                }
                                                                                                                                            ]
                                                                                                                                        }
                                                                                                                                    ]
                                                                                                                                }
                                                                                                                                ]
                                                                                                                            }
                                                                                                                        ]
                                                                                                                    }
                                                                                                                ]
                                                                                                            }
                                                                                                        ]
                                                                                                    }
                                                                                                ]
                                                                                            }
                                                                                        ]
                                                                                    },
                                                                                    {
                                                                                        "name": "Menba",
                                                                                        "children": [
                                                                                            {
                                                                                                "name": "Badak",
                                                                                                "children": [
                                                                                                    {
                                                                                                        "name": "Dakram",
                                                                                                        "children": [
                                                                                                            {
                                                                                                                "name": "Ramka",
                                                                                                                "children": [
                                                                                                                    {
                                                                                                                        "name": "Kali"
                                                                                                                    }
                                                                                                                ]
                                                                                                            }
                                                                                                        ]
                                                                                                    }
                                                                                                ]
                                                                                            }
                                                                                        ]
                                                                                    },
                                                                                    {
                                                                                        "name": "Menbom"
                                                                                    },
                                                                                    {
                                                                                        "name": "Menbi",
                                                                                        "children": [
                                                                                            {
                                                                                                "name": "Bini",
                                                                                                "children": [
                                                                                                    {
                                                                                                        "name": "Nido",
                                                                                                        "children": [
                                                                                                            {
                                                                                                                "name": "Dori",
                                                                                                                "children": [
                                                                                                                    {
                                                                                                                        "name": "Riji"
                                                                                                                    }
                                                                                                                ]
                                                                                                            }
                                                                                                        ]
                                                                                                    }
                                                                                                ]
                                                                                            }
                                                                                        ]
                                                                                    }
                                                                                ]
                                                                            }
                                                                        ]
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                "name": "Boa",
                                                                "children": [
                                                                    {
                                                                        "name": "Ango",
                                                                        "children": []
                                                                    }
                                                                ]
                                                            },
                                                            {
                                                                "name": "Boi",
                                                                "children": [
                                                                    {
                                                                        "name": "Ingo"
                                                                    }
                                                                ]
                                                            }
                                                        ]
                                                    }
                                                ]
                                            }
                                        ]
                                    }
                                ]
                            }
                        ]
                    }
                ]
            }
        ]
    }
}
