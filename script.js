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
            const response = await fetch('/geneology.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.originalData = await response.json();
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