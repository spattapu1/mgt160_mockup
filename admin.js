// Admin dashboard functionality
let supabaseAdmin = null;
let facetedChartData = null; // Store data for dynamic updates

// Tooltip utility functions
const tooltip = {
    element: null,
    
    init() {
        this.element = d3.select('#chart-tooltip');
        if (this.element.empty()) {
            // Create tooltip if it doesn't exist
            this.element = d3.select('body').append('div')
                .attr('id', 'chart-tooltip')
                .attr('class', 'chart-tooltip')
                .style('opacity', 0);
        }
    },
    
    show(event, content) {
        if (!this.element) this.init();
        
        this.element
            .html(content)
            .style('opacity', 1)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px')
            .classed('show', true);
    },
    
    hide() {
        if (!this.element) this.init();
        
        this.element
            .style('opacity', 0)
            .classed('show', false);
    },
    
    move(event) {
        if (!this.element) this.init();
        
        this.element
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 10) + 'px');
    }
};

// Initialize tooltip on page load
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        tooltip.init();
    });
}

// Initialize Supabase admin client
function initSupabaseAdmin() {
    if (typeof supabase === 'undefined') {
        console.error('Supabase library not loaded');
        return false;
    }
    
    // Check if credentials are configured
    if (typeof SUPABASE_URL === 'undefined' || SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
        typeof SUPABASE_ANON_KEY === 'undefined' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.error('Supabase credentials not configured');
        console.error('SUPABASE_URL:', typeof SUPABASE_URL, SUPABASE_URL);
        console.error('SUPABASE_ANON_KEY:', typeof SUPABASE_ANON_KEY, SUPABASE_ANON_KEY ? 'defined' : 'undefined');
        showError('Supabase not configured. Please set up your credentials.');
        return false;
    }
    
    console.log('Initializing Supabase admin with URL:', SUPABASE_URL);
    supabaseAdmin = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('Supabase admin client created successfully');
    return true;
}

// Check if user is already logged in
async function checkAuth() {
    console.log('checkAuth() called');
    if (!supabaseAdmin) {
        if (!initSupabaseAdmin()) {
            console.error('Failed to initialize Supabase');
            return;
        }
    }
    
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    console.log('Session check:', session ? 'Logged in' : 'Not logged in');
    
    if (session) {
        console.log('User has session, showing dashboard');
        showDashboard();
        loadData();
        setupCSVAutoRefresh();
    } else {
        console.log('No session, showing login');
        showLogin();
    }
}

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    if (!initSupabaseAdmin()) {
        showError('Supabase not configured. Please configure supabase-config.js');
        return;
    }
    
    checkAuth();
    
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorMsg = document.getElementById('error-message');
            
            // Hide previous errors
            errorMsg.classList.remove('show');
            errorMsg.textContent = '';
            
            try {
                if (!supabaseAdmin) {
                    console.error('supabaseAdmin not initialized');
                    if (!initSupabaseAdmin()) {
                        showError('Failed to initialize Supabase. Please refresh the page.');
                        return;
                    }
                }
                
                console.log('Attempting login for:', email);
                console.log('Supabase client:', supabaseAdmin ? 'initialized' : 'not initialized');
                
                const { data, error } = await supabaseAdmin.auth.signInWithPassword({
                    email: email,
                    password: password
                });
                
                console.log('Login response:', { 
                    hasData: !!data, 
                    hasSession: !!(data && data.session),
                    error: error ? error.message : null 
                });
                
                if (error) {
                    console.error('Login error:', error);
                    showError(error.message || 'Invalid email or password');
                    return;
                }
                
                if (data && data.session) {
                    console.log('Login successful, showing dashboard');
                    showDashboard();
                    loadData();
                    setupCSVAutoRefresh();
                } else {
                    console.error('Login succeeded but no session');
                    showError('Login failed - no session created. Please try again.');
                }
            } catch (err) {
                console.error('Login exception:', err);
                showError('An error occurred during login: ' + (err.message || 'Please try again.'));
            }
        });
    }
});

// Show error message
function showError(message) {
    const errorMsg = document.getElementById('error-message');
    if (errorMsg) {
        errorMsg.textContent = message;
        errorMsg.classList.add('show');
    }
}

// Show login page
function showLogin() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('dashboard-page').classList.add('hidden');
}

// Show dashboard
function showDashboard() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('dashboard-page').classList.remove('hidden');
}

// Logout
async function logout() {
    // Clear auto-refresh interval
    if (csvRefreshInterval) {
        clearInterval(csvRefreshInterval);
        csvRefreshInterval = null;
    }
    
    if (supabaseAdmin) {
        await supabaseAdmin.auth.signOut();
    }
    showLogin();
    // Clear form
    document.getElementById('login-form').reset();
}

// Load survey data
async function loadData() {
    console.log('loadData() called');
    const loading = document.getElementById('loading');
    const tableContainer = document.getElementById('table-container');
    const tableBody = document.getElementById('data-table-body');
    
    if (!supabaseAdmin) {
        console.error('supabaseAdmin not initialized');
        return;
    }
    
    // Check if user is logged in
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    if (!session) {
        console.error('No session - user not logged in');
        showLogin();
        return;
    }
    console.log('User is logged in, loading data...');
    
    loading.classList.remove('hidden');
    tableContainer.classList.add('hidden');
    
    try {
        console.log('Fetching data from Supabase...');
        const { data, error } = await supabaseAdmin
            .from('survey_responses')
            .select('*')
            .order('created_at', { ascending: false });
        
        console.log('Supabase response:', { data, error });
        
        if (error) {
            console.error('Error loading data:', error);
            loading.textContent = 'Error loading data: ' + error.message;
            return;
        }
        
        console.log('Data loaded successfully:', data?.length || 0, 'rows');
        
        // Update stats
        updateStats(data);
        
        // Populate table
        tableBody.innerHTML = '';
        
        if (data && data.length > 0) {
            data.forEach(row => {
                const tr = document.createElement('tr');
                
                const demographics = row.demographics || {};
                const groupClass = row.group === 'control' ? 'group-control' : 'group-treatment';
                
                tr.innerHTML = `
                    <td>${row.id}</td>
                    <td><span class="group-badge ${groupClass}">${row.group}</span></td>
                    <td>${demographics.age || 'N/A'}</td>
                    <td>${demographics.sex || 'N/A'}</td>
                    <td>${demographics.gambling || 'N/A'}</td>
                    <td>$${row.final_balance || 0}</td>
                    <td>${new Date(row.created_at).toLocaleString()}</td>
                `;
                
                tableBody.appendChild(tr);
            });
        } else {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 40px;">No data available yet</td></tr>';
        }
        
        loading.classList.add('hidden');
        tableContainer.classList.remove('hidden');
        
        // Also load CSV data
        loadCSVData(data);
        
    } catch (err) {
        console.error('Exception loading data:', err);
        loading.textContent = 'Error loading data. Please check console.';
    }
}

// Load CSV-style detailed data
let csvDataCache = null;
let csvRefreshInterval = null;

async function loadCSVData(data = null) {
    const csvLoading = document.getElementById('csv-loading');
    const csvTableContainer = document.getElementById('csv-table-container');
    const csvTableHead = document.getElementById('csv-table-head');
    const csvTableBody = document.getElementById('csv-table-body');
    
    if (!supabaseAdmin) {
        console.error('supabaseAdmin not initialized');
        return;
    }
    
    // Check if user is logged in
    const { data: { session } } = await supabaseAdmin.auth.getSession();
    if (!session) {
        console.error('No session - user not logged in');
        return;
    }
    
    csvLoading.classList.remove('hidden');
    csvTableContainer.classList.add('hidden');
    
    try {
        // Use provided data or fetch from database
        let responseData = data;
        if (!responseData) {
            const { data: fetchedData, error } = await supabaseAdmin
                .from('survey_responses')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error loading CSV data:', error);
                csvLoading.textContent = 'Error loading CSV data: ' + error.message;
                return;
            }
            responseData = fetchedData;
        }
        
        csvDataCache = responseData;
        
        // Generate CSV table
        generateCSVTable(responseData);
        
        csvLoading.classList.add('hidden');
        csvTableContainer.classList.remove('hidden');
        
    } catch (err) {
        console.error('Exception loading CSV data:', err);
        csvLoading.textContent = 'Error loading CSV data. Please check console.';
    }
}

// Generate CSV-style table with all columns
function generateCSVTable(data) {
    const csvTableHead = document.getElementById('csv-table-head');
    const csvTableBody = document.getElementById('csv-table-body');
    
    if (!data || data.length === 0) {
        csvTableHead.innerHTML = '';
        csvTableBody.innerHTML = '<tr><td colspan="100" style="text-align: center; padding: 40px;">No data available yet</td></tr>';
        return;
    }
    
    // Generate column headers
    const baseColumns = ['id', 'email', 'gender', 'prev_exp', 'group', 'final_balance', 'created_at'];
    const roundColumns = [];
    
    // Generate round columns (1-12)
    for (let round = 1; round <= 12; round++) {
        roundColumns.push(
            `round${round}_result`,
            `round${round}_risk`,
            `round${round}_betsize`,
            `round${round}_winnings`,
            `round${round}_balance_before`,
            `round${round}_time`
        );
    }
    
    const allColumns = [...baseColumns, ...roundColumns];
    
    // Create header row
    const headerRow = document.createElement('tr');
    allColumns.forEach(col => {
        const th = document.createElement('th');
        th.textContent = col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        headerRow.appendChild(th);
    });
    csvTableHead.innerHTML = '';
    csvTableHead.appendChild(headerRow);
    
    // Create data rows
    csvTableBody.innerHTML = '';
    data.forEach(row => {
        const tr = document.createElement('tr');
        
        // Base columns
        const demographics = row.demographics || {};
        const roundData = row.round_data || [];
        
        // ID
        const tdId = document.createElement('td');
        tdId.textContent = row.id || '';
        tr.appendChild(tdId);
        
        // Email
        const tdEmail = document.createElement('td');
        tdEmail.textContent = demographics.email || '';
        tr.appendChild(tdEmail);
        
        // Gender
        const tdGender = document.createElement('td');
        tdGender.textContent = demographics.sex || '';
        tr.appendChild(tdGender);
        
        // Prev Exp
        const tdPrevExp = document.createElement('td');
        tdPrevExp.textContent = demographics.gambling || '';
        tr.appendChild(tdPrevExp);
        
        // Group
        const tdGroup = document.createElement('td');
        tdGroup.textContent = row.group || '';
        tr.appendChild(tdGroup);
        
        // Final Balance
        const tdFinalBalance = document.createElement('td');
        tdFinalBalance.textContent = row.final_balance || '';
        tr.appendChild(tdFinalBalance);
        
        // Created At
        const tdCreatedAt = document.createElement('td');
        tdCreatedAt.textContent = row.created_at ? new Date(row.created_at).toLocaleString() : '';
        tr.appendChild(tdCreatedAt);
        
        // Round columns (1-12)
        for (let round = 1; round <= 12; round++) {
            const roundIndex = round - 1;
            const roundInfo = roundData[roundIndex] || {};
            
            // Result (won/lost based on winnings)
            const tdResult = document.createElement('td');
            if (roundInfo.winnings !== undefined && roundInfo.winnings !== null) {
                const winnings = parseFloat(roundInfo.winnings) || 0;
                tdResult.textContent = winnings > 0 ? 'win' : (winnings < 0 ? 'loss' : 'breakeven');
            } else {
                tdResult.textContent = '';
            }
            tr.appendChild(tdResult);
            
            // Risk
            const tdRisk = document.createElement('td');
            tdRisk.textContent = roundInfo.risk || '';
            tr.appendChild(tdRisk);
            
            // Bet Size
            const tdBetSize = document.createElement('td');
            tdBetSize.textContent = roundInfo.betAmount !== undefined && roundInfo.betAmount !== null ? roundInfo.betAmount : '';
            tr.appendChild(tdBetSize);
            
            // Winnings
            const tdWinnings = document.createElement('td');
            tdWinnings.textContent = roundInfo.winnings !== undefined && roundInfo.winnings !== null ? roundInfo.winnings : '';
            tr.appendChild(tdWinnings);
            
            // Balance Before
            const tdBalanceBefore = document.createElement('td');
            tdBalanceBefore.textContent = roundInfo.balanceBefore !== undefined && roundInfo.balanceBefore !== null ? roundInfo.balanceBefore : '';
            tr.appendChild(tdBalanceBefore);
            
            // Time
            const tdTime = document.createElement('td');
            tdTime.textContent = roundInfo.bettingTime !== undefined && roundInfo.bettingTime !== null ? roundInfo.bettingTime : '';
            tr.appendChild(tdTime);
        }
        
        csvTableBody.appendChild(tr);
    });
}

// Download CSV file
function downloadCSV() {
    if (!csvDataCache || csvDataCache.length === 0) {
        alert('No data available to download. Please refresh first.');
        return;
    }
    
    // Generate column headers
    const baseColumns = ['id', 'email', 'gender', 'prev_exp', 'group', 'final_balance', 'created_at'];
    const roundColumns = [];
    
    for (let round = 1; round <= 12; round++) {
        roundColumns.push(
            `round${round}_result`,
            `round${round}_risk`,
            `round${round}_betsize`,
            `round${round}_winnings`,
            `round${round}_balance_before`,
            `round${round}_time`
        );
    }
    
    const allColumns = [...baseColumns, ...roundColumns];
    
    // Create CSV content
    let csvContent = allColumns.join(',') + '\n';
    
    csvDataCache.forEach(row => {
        const demographics = row.demographics || {};
        const roundData = row.round_data || [];
        const rowData = [];
        
        // Base columns
        rowData.push(row.id || '');
        rowData.push(escapeCSV(demographics.email || ''));
        rowData.push(escapeCSV(demographics.sex || ''));
        rowData.push(escapeCSV(demographics.gambling || ''));
        rowData.push(escapeCSV(row.group || ''));
        rowData.push(row.final_balance || '');
        rowData.push(row.created_at ? new Date(row.created_at).toISOString() : '');
        
        // Round columns (1-12)
        for (let round = 1; round <= 12; round++) {
            const roundIndex = round - 1;
            const roundInfo = roundData[roundIndex] || {};
            
            // Result
            if (roundInfo.winnings !== undefined && roundInfo.winnings !== null) {
                const winnings = parseFloat(roundInfo.winnings) || 0;
                rowData.push(winnings > 0 ? 'win' : (winnings < 0 ? 'loss' : 'breakeven'));
            } else {
                rowData.push('');
            }
            
            // Risk
            rowData.push(escapeCSV(roundInfo.risk || ''));
            
            // Bet Size
            rowData.push(roundInfo.betAmount !== undefined && roundInfo.betAmount !== null ? roundInfo.betAmount : '');
            
            // Winnings
            rowData.push(roundInfo.winnings !== undefined && roundInfo.winnings !== null ? roundInfo.winnings : '');
            
            // Balance Before
            rowData.push(roundInfo.balanceBefore !== undefined && roundInfo.balanceBefore !== null ? roundInfo.balanceBefore : '');
            
            // Time
            rowData.push(roundInfo.bettingTime !== undefined && roundInfo.bettingTime !== null ? roundInfo.bettingTime : '');
        }
        
        csvContent += rowData.join(',') + '\n';
    });
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `survey_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Escape CSV values (handle commas, quotes, newlines)
function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const stringValue = String(value);
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
    }
    return stringValue;
}

// Set up auto-refresh for CSV table
function setupCSVAutoRefresh() {
    // Clear existing interval if any
    if (csvRefreshInterval) {
        clearInterval(csvRefreshInterval);
    }
    
    // Refresh every 30 seconds
    csvRefreshInterval = setInterval(() => {
        loadCSVData();
    }, 30000);
}

// Update statistics
function updateStats(data) {
    if (!data || data.length === 0) {
        document.getElementById('total-responses').textContent = '0';
        document.getElementById('control-count').textContent = '0';
        document.getElementById('treatment-count').textContent = '0';
        document.getElementById('avg-balance').textContent = '$0';
        updateVisualizations(data);
        return;
    }
    
    const total = data.length;
    const control = data.filter(r => r.group === 'control').length;
    const treatment = data.filter(r => r.group === 'treatment').length;
    const avgBalance = data.reduce((sum, r) => sum + (parseFloat(r.final_balance) || 0), 0) / total;
    
    document.getElementById('total-responses').textContent = total;
    document.getElementById('control-count').textContent = control;
    document.getElementById('treatment-count').textContent = treatment;
    document.getElementById('avg-balance').textContent = '$' + avgBalance.toFixed(2);
    
    // Update visualizations
    updateVisualizations(data);
    updateDBetChart(data);
    updateBetSizeChart(data);
    updatePostOutcomeChart(data);
    updateFacetedCharts(data);
    updateRiskChoiceChart(data);
    updateRiskRoundsChart(data);
    updateBettingTimeChart(data);
}

// Update visualizations with comparison data
function updateVisualizations(data) {
    if (!data || data.length === 0) {
        // Reset all visualizations to 0
        resetVisualizations();
        return;
    }
    
    const controlData = data.filter(r => r.group === 'control');
    const treatmentData = data.filter(r => r.group === 'treatment');
    
    // Calculate averages
    const controlAvgBalance = controlData.length > 0 
        ? controlData.reduce((sum, r) => sum + (parseFloat(r.final_balance) || 0), 0) / controlData.length 
        : 0;
    const treatmentAvgBalance = treatmentData.length > 0 
        ? treatmentData.reduce((sum, r) => sum + (parseFloat(r.final_balance) || 0), 0) / treatmentData.length 
        : 0;
    
    // Calculate min/max
    const controlBalances = controlData.map(r => parseFloat(r.final_balance) || 0);
    const treatmentBalances = treatmentData.map(r => parseFloat(r.final_balance) || 0);
    const controlMin = controlBalances.length > 0 ? Math.min(...controlBalances) : 0;
    const controlMax = controlBalances.length > 0 ? Math.max(...controlBalances) : 0;
    const treatmentMin = treatmentBalances.length > 0 ? Math.min(...treatmentBalances) : 0;
    const treatmentMax = treatmentBalances.length > 0 ? Math.max(...treatmentBalances) : 0;
    
    // Update bar charts
    updateBarChart('control-balance', controlAvgBalance, Math.max(controlAvgBalance, treatmentAvgBalance, 100));
    updateBarChart('treatment-balance', treatmentAvgBalance, Math.max(controlAvgBalance, treatmentAvgBalance, 100));
    updateBarChart('control-count', controlData.length, Math.max(controlData.length, treatmentData.length, 1));
    updateBarChart('treatment-count', treatmentData.length, Math.max(controlData.length, treatmentData.length, 1));
    
    // Update comparison table
    document.getElementById('control-total').textContent = controlData.length;
    document.getElementById('treatment-total').textContent = treatmentData.length;
    document.getElementById('total-diff').textContent = (treatmentData.length - controlData.length);
    
    document.getElementById('control-avg-balance').textContent = '$' + controlAvgBalance.toFixed(2);
    document.getElementById('treatment-avg-balance').textContent = '$' + treatmentAvgBalance.toFixed(2);
    document.getElementById('balance-diff').textContent = '$' + (treatmentAvgBalance - controlAvgBalance).toFixed(2);
    
    document.getElementById('control-min-balance').textContent = '$' + controlMin.toFixed(2);
    document.getElementById('treatment-min-balance').textContent = '$' + treatmentMin.toFixed(2);
    document.getElementById('min-diff').textContent = '$' + (treatmentMin - controlMin).toFixed(2);
    
    document.getElementById('control-max-balance').textContent = '$' + controlMax.toFixed(2);
    document.getElementById('treatment-max-balance').textContent = '$' + treatmentMax.toFixed(2);
    document.getElementById('max-diff').textContent = '$' + (treatmentMax - controlMax).toFixed(2);
}

// Update a bar chart
function updateBarChart(idPrefix, value, maxValue) {
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const bar = document.getElementById(idPrefix + '-bar');
    const valueSpan = document.getElementById(idPrefix + '-value');
    
    if (bar && valueSpan) {
        bar.style.width = percentage + '%';
        if (idPrefix.includes('balance')) {
            valueSpan.textContent = '$' + value.toFixed(2);
        } else {
            valueSpan.textContent = value;
        }
    }
}

// Reset visualizations to zero
function resetVisualizations() {
    updateBarChart('control-balance', 0, 100);
    updateBarChart('treatment-balance', 0, 100);
    updateBarChart('control-count', 0, 1);
    updateBarChart('treatment-count', 0, 1);
    
    document.getElementById('control-total').textContent = '0';
    document.getElementById('treatment-total').textContent = '0';
    document.getElementById('total-diff').textContent = '0';
    document.getElementById('control-avg-balance').textContent = '$0';
    document.getElementById('treatment-avg-balance').textContent = '$0';
    document.getElementById('balance-diff').textContent = '$0';
    document.getElementById('control-min-balance').textContent = '$0';
    document.getElementById('treatment-min-balance').textContent = '$0';
    document.getElementById('min-diff').textContent = '$0';
    document.getElementById('control-max-balance').textContent = '$0';
    document.getElementById('treatment-max-balance').textContent = '$0';
    document.getElementById('max-diff').textContent = '$0';
}

// Calculate mean change in bet size (ΔBet) and create D3.js chart
function updateDBetChart(data) {
    const container = document.getElementById('dbet-chart-container');
    if (!container) return;
    
    // Clear previous chart
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    // Calculate ΔBet for each participant
    const controlDBets = [];
    const treatmentDBets = [];
    
    data.forEach(response => {
        const roundData = response.round_data || [];
        if (!Array.isArray(roundData) || roundData.length < 2) return;
        
        // Calculate changes in bet size between consecutive rounds
        const betChanges = [];
        for (let i = 1; i < roundData.length; i++) {
            const prevBet = parseFloat(roundData[i - 1]?.betAmount) || 0;
            const currBet = parseFloat(roundData[i]?.betAmount) || 0;
            if (prevBet > 0 && currBet > 0) {
                betChanges.push(currBet - prevBet);
            }
        }
        
        // Calculate mean ΔBet for this participant
        if (betChanges.length > 0) {
            const meanDBet = betChanges.reduce((sum, change) => sum + change, 0) / betChanges.length;
            if (response.group === 'control') {
                controlDBets.push(meanDBet);
            } else if (response.group === 'treatment') {
                treatmentDBets.push(meanDBet);
            }
        }
    });
    
    // Calculate statistics for each group
    const controlStats = calculateStats(controlDBets);
    const treatmentStats = calculateStats(treatmentDBets);
    
    // Prepare data for chart
    const chartData = [
        {
            group: 'Control',
            mean: controlStats.mean,
            ciLower: controlStats.ciLower,
            ciUpper: controlStats.ciUpper,
            values: controlDBets,
            color: '#1976d2'
        },
        {
            group: 'Treatment',
            mean: treatmentStats.mean,
            ciLower: treatmentStats.ciLower,
            ciUpper: treatmentStats.ciUpper,
            values: treatmentDBets,
            color: '#f57c00'
        }
    ];
    
    // Create D3.js chart
    createDBetChart(container, chartData);
}

// Calculate mean and 95% confidence interval
function calculateStats(values) {
    if (values.length === 0) {
        return { mean: 0, ciLower: 0, ciUpper: 0, stdDev: 0, n: 0 };
    }
    
    const n = values.length;
    const mean = values.reduce((sum, val) => sum + val, 0) / n;
    
    // Handle edge cases
    if (n === 1) {
        // With only one value, we can't calculate variance or CI
        // Use the mean as both bounds (no uncertainty)
        return {
            mean: mean,
            ciLower: mean,
            ciUpper: mean,
            stdDev: 0,
            n: n
        };
    }
    
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (n - 1);
    const stdDev = Math.sqrt(variance);
    
    // 95% CI: mean ± (t-value * standard error)
    // Using t-value ≈ 1.96 for large samples, or approximate for small samples
    const tValue = n > 30 ? 1.96 : 2.0; // Approximation
    const standardError = stdDev / Math.sqrt(n);
    const margin = tValue * standardError;
    
    // Ensure we don't return NaN
    const ciLower = isNaN(mean - margin) ? mean : mean - margin;
    const ciUpper = isNaN(mean + margin) ? mean : mean + margin;
    
    return {
        mean: isNaN(mean) ? 0 : mean,
        ciLower: isNaN(ciLower) ? 0 : ciLower,
        ciUpper: isNaN(ciUpper) ? 0 : ciUpper,
        stdDev: isNaN(stdDev) ? 0 : stdDev,
        n: n
    };
}

// Create D3.js bar chart with error bars
function createDBetChart(container, data) {
    // Set dimensions - standardized for dashboard
    const margin = { top: 50, right: 50, bottom: 70, left: 90 };
    // Get container width, with fallback for when container is not yet visible
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 
                          (container.parentElement?.clientWidth > 0 ? container.parentElement.clientWidth - 60 : 900);
    const width = Math.max(containerWidth - margin.left - margin.right, 600);
    const height = 450 - margin.top - margin.bottom;
    
    // Clear container
    container.innerHTML = '';
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Find min/max for Y-axis (include error bars)
    const allValues = data.flatMap(d => [d.ciLower, d.ciUpper, d.mean, ...d.values]).filter(v => !isNaN(v) && isFinite(v));
    
    if (allValues.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No valid data available for chart</p>';
        return;
    }
    
    const yMin = Math.min(...allValues, 0);
    const yMax = Math.max(...allValues, 0);
    const yRange = yMax - yMin;
    const yPadding = yRange > 0 ? yRange * 0.1 : Math.max(Math.abs(yMin), Math.abs(yMax)) * 0.1 || 10;
    
    // Scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.group))
        .range([0, width])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([yMin - yPadding, yMax + yPadding])
        .range([height, 0]);
    
    // X-axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('class', 'chart-axis')
        .style('font-size', '14px');
    
    // Y-axis
    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('class', 'chart-axis')
        .style('font-size', '12px');
    
    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Mean Change in Bet Size (ΔBet)');
    
    // X-axis label
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + 50})`)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Condition');
    
    // Draw individual data points (strip plot overlay)
    data.forEach((d, i) => {
        const xPos = xScale(d.group) + xScale.bandwidth() / 2;
        const jitterWidth = xScale.bandwidth() * 0.3;
        
        d.values.filter(v => !isNaN(v) && isFinite(v)).forEach((value, j) => {
            const jitter = (Math.random() - 0.5) * jitterWidth;
            const cy = yScale(value);
            if (!isNaN(cy) && isFinite(cy)) {
                g.append('circle')
                    .attr('cx', xPos + jitter)
                    .attr('cy', cy)
                    .attr('r', 4)
                    .attr('fill', d.color)
                    .attr('opacity', 0.6)
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1)
                    .on('mouseover', function(event) {
                        tooltip.show(event, `<strong>${d.group}</strong><div>Value: ${value.toFixed(2)}</div><div>n: ${d.n}</div>`);
                    })
                    .on('mouseout', () => tooltip.hide())
                    .on('mousemove', (event) => tooltip.move(event))
                    .attr('class', 'data-point');
            }
        });
    });
    
    // Draw error bars (95% CI) - only if values are valid
    data.forEach(d => {
        if (isNaN(d.mean) || !isFinite(d.mean)) return;
        
        const xPos = xScale(d.group) + xScale.bandwidth() / 2;
        const meanY = yScale(d.mean);
        const upperY = yScale(d.ciUpper);
        const lowerY = yScale(d.ciLower);
        
        // Only draw if all values are valid
        if (isNaN(meanY) || isNaN(upperY) || isNaN(lowerY) || 
            !isFinite(meanY) || !isFinite(upperY) || !isFinite(lowerY)) {
            return;
        }
        
        // Vertical line
        g.append('line')
            .attr('x1', xPos)
            .attr('x2', xPos)
            .attr('y1', upperY)
            .attr('y2', lowerY)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('class', 'error-bar');
        
        // Upper cap
        g.append('line')
            .attr('x1', xPos - 5)
            .attr('x2', xPos + 5)
            .attr('y1', upperY)
            .attr('y2', upperY)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('class', 'error-bar');
        
        // Lower cap
        g.append('line')
            .attr('x1', xPos - 5)
            .attr('x2', xPos + 5)
            .attr('y1', lowerY)
            .attr('y2', lowerY)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .attr('class', 'error-bar');
    });
    
    // Draw bars (only if mean is valid)
    g.selectAll('.bar')
        .data(data.filter(d => !isNaN(d.mean) && isFinite(d.mean)))
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.group))
        .attr('y', d => {
            const meanY = yScale(d.mean);
            const zeroY = yScale(0);
            return Math.min(meanY, zeroY);
        })
        .attr('width', xScale.bandwidth())
        .attr('height', d => {
            const meanY = yScale(d.mean);
            const zeroY = yScale(0);
            return Math.abs(meanY - zeroY);
        })
        .attr('fill', d => d.color)
        .attr('opacity', 0.7)
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            const content = `<strong>${d.group}</strong>
                <div>Mean: ${d.mean.toFixed(2)}</div>
                <div>95% CI: [${d.ciLower.toFixed(2)}, ${d.ciUpper.toFixed(2)}]</div>
                <div>n: ${d.n}</div>`;
            tooltip.show(event, content);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    // Draw mean line markers (only if mean is valid)
    data.forEach(d => {
        if (isNaN(d.mean) || !isFinite(d.mean)) return;
        
        const xPos = xScale(d.group) + xScale.bandwidth() / 2;
        const meanY = yScale(d.mean);
        
        if (!isNaN(meanY) && isFinite(meanY)) {
            g.append('line')
                .attr('x1', xPos - xScale.bandwidth() / 2)
                .attr('x2', xPos + xScale.bandwidth() / 2)
                .attr('y1', meanY)
                .attr('y2', meanY)
                .attr('stroke', '#fff')
                .attr('stroke-width', 2);
        }
    });
    
    // Add legend
    const legend = g.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);
    
    const legendData = [
        { label: 'Control', color: '#1976d2' },
        { label: 'Treatment', color: '#f57c00' }
    ];
    
    legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .each(function(d) {
            const g = d3.select(this);
            g.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', d.color);
            g.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('font-size', '12px')
                .style('fill', '#333')
                .text(d.label);
        });
    
    // Add statistics text
    const statsText = g.append('g')
        .attr('transform', `translate(10, 20)`);
    
    data.forEach((d, i) => {
        statsText.append('text')
            .attr('y', i * 20)
            .style('font-size', '11px')
            .style('fill', '#666')
            .text(`${d.group}: Mean = ${d.mean.toFixed(2)}, 95% CI [${d.ciLower.toFixed(2)}, ${d.ciUpper.toFixed(2)}], n = ${d.values.length}`);
    });
}

// Calculate and create line plot of bet size over rounds
function updateBetSizeChart(data) {
    const container = document.getElementById('bet-size-chart-container');
    if (!container) return;
    
    // Clear previous chart
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    // Calculate average bet size per round for each group
    const controlData = data.filter(r => r.group === 'control');
    const treatmentData = data.filter(r => r.group === 'treatment');
    
    // Initialize arrays for each round (1-12)
    const controlBetSizes = Array(12).fill(null).map(() => []);
    const treatmentBetSizes = Array(12).fill(null).map(() => []);
    
    // Collect bet amounts for each round
    controlData.forEach(response => {
        const roundData = response.round_data || [];
        roundData.forEach((round, index) => {
            if (index < 12 && round?.betAmount) {
                const betAmount = parseFloat(round.betAmount);
                if (!isNaN(betAmount) && betAmount > 0) {
                    controlBetSizes[index].push(betAmount);
                }
            }
        });
    });
    
    treatmentData.forEach(response => {
        const roundData = response.round_data || [];
        roundData.forEach((round, index) => {
            if (index < 12 && round?.betAmount) {
                const betAmount = parseFloat(round.betAmount);
                if (!isNaN(betAmount) && betAmount > 0) {
                    treatmentBetSizes[index].push(betAmount);
                }
            }
        });
    });
    
    // Calculate averages for each round
    const controlAverages = controlBetSizes.map((bets, index) => {
        if (bets.length === 0) return null;
        const avg = bets.reduce((sum, bet) => sum + bet, 0) / bets.length;
        return {
            round: index + 1,
            average: avg,
            count: bets.length
        };
    });
    
    const treatmentAverages = treatmentBetSizes.map((bets, index) => {
        if (bets.length === 0) return null;
        const avg = bets.reduce((sum, bet) => sum + bet, 0) / bets.length;
        return {
            round: index + 1,
            average: avg,
            count: bets.length
        };
    });
    
    // Prepare data for chart
    const chartData = {
        control: controlAverages.filter(d => d !== null),
        treatment: treatmentAverages.filter(d => d !== null)
    };
    
    // Create D3.js line chart
    createBetSizeChart(container, chartData);
}

// Create D3.js line chart for bet size over rounds
function createBetSizeChart(container, data) {
    // Set dimensions - standardized for dashboard
    const margin = { top: 50, right: 50, bottom: 70, left: 90 };
    // Get container width, with fallback for when container is not yet visible
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 
                          (container.parentElement?.clientWidth > 0 ? container.parentElement.clientWidth - 60 : 900);
    const width = Math.max(containerWidth - margin.left - margin.right, 600);
    const height = 450 - margin.top - margin.bottom;
    
    // Clear container
    container.innerHTML = '';
    
    // Check if we have any data
    const allValues = [
        ...data.control.map(d => d.average),
        ...data.treatment.map(d => d.average)
    ].filter(v => v !== null && !isNaN(v) && isFinite(v));
    
    if (allValues.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No valid data available for chart</p>';
        return;
    }
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Find min/max for Y-axis
    const yMin = Math.min(...allValues, 0);
    const yMax = Math.max(...allValues);
    const yPadding = (yMax - yMin) * 0.1 || 10;
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain([1, 12])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([Math.max(0, yMin - yPadding), yMax + yPadding])
        .range([height, 0]);
    
    // X-axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(12).tickFormat(d => d))
        .selectAll('text')
        .attr('class', 'chart-axis')
        .style('font-size', '12px');
    
    // Y-axis
    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('class', 'chart-axis')
        .style('font-size', '12px');
    
    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Average Bet Amount ($)');
    
    // X-axis label
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + 50})`)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Round Number');
    
    // Line generator
    const line = d3.line()
        .x(d => xScale(d.round))
        .y(d => yScale(d.average))
        .curve(d3.curveMonotoneX); // Smooth curve
    
    // Draw Control line
    if (data.control.length > 0) {
        g.append('path')
            .datum(data.control)
            .attr('fill', 'none')
            .attr('stroke', '#1976d2')
            .attr('stroke-width', 3)
            .attr('d', line);
        
        // Add data points for Control
        g.selectAll('.control-point')
            .data(data.control)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.round))
            .attr('cy', d => yScale(d.average))
            .attr('r', 5)
            .attr('fill', '#1976d2')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', function(event, d) {
                tooltip.show(event, `<strong>Control - Round ${d.round}</strong><div>Average Bet: $${d.average.toFixed(2)}</div><div>n: ${d.count}</div>`);
            })
            .on('mouseout', () => tooltip.hide())
            .on('mousemove', (event) => tooltip.move(event));
    }
    
    // Draw Treatment line
    if (data.treatment.length > 0) {
        g.append('path')
            .datum(data.treatment)
            .attr('fill', 'none')
            .attr('stroke', '#f57c00')
            .attr('stroke-width', 3)
            .attr('d', line);
        
        // Add data points for Treatment
        g.selectAll('.treatment-point')
            .data(data.treatment)
            .enter()
            .append('circle')
            .attr('cx', d => xScale(d.round))
            .attr('cy', d => yScale(d.average))
            .attr('r', 5)
            .attr('fill', '#f57c00')
            .attr('stroke', '#fff')
            .attr('stroke-width', 2)
            .on('mouseover', function(event, d) {
                tooltip.show(event, `<strong>Treatment - Round ${d.round}</strong><div>Average Bet: $${d.average.toFixed(2)}</div><div>n: ${d.count}</div>`);
            })
            .on('mouseout', () => tooltip.hide())
            .on('mousemove', (event) => tooltip.move(event));
    }
    
    // Add legend
    const legend = g.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);
    
    const legendData = [
        { label: 'Control', color: '#1976d2', hasData: data.control.length > 0 },
        { label: 'Treatment', color: '#f57c00', hasData: data.treatment.length > 0 }
    ].filter(d => d.hasData);
    
    legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .each(function(d) {
            const g = d3.select(this);
            g.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('stroke', d.color)
                .attr('stroke-width', 3);
            g.append('text')
                .attr('x', 25)
                .attr('y', 4)
                .style('font-size', '12px')
                .style('fill', '#333')
                .text(d.label);
        });
    
    // Add grid lines
    g.append('g')
        .attr('class', 'grid')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .ticks(12)
            .tickSize(-height)
            .tickFormat(''))
        .selectAll('line')
        .attr('stroke', '#e0e0e0')
        .attr('stroke-dasharray', '2,2');
    
    g.append('g')
        .attr('class', 'grid')
        .call(d3.axisLeft(yScale)
            .tickSize(-width)
            .tickFormat(''))
        .selectAll('line')
        .attr('stroke', '#e0e0e0')
        .attr('stroke-dasharray', '2,2');
}

// Calculate and create grouped bar chart for post-outcome bet analysis
function updatePostOutcomeChart(data) {
    const container = document.getElementById('post-outcome-chart-container');
    if (!container) return;
    
    // Clear previous chart
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    // Organize data by: (previous outcome, condition) -> bet amounts
    const dataMap = {
        control: { win: [], loss: [], breakeven: [] },
        treatment: { win: [], loss: [], breakeven: [] }
    };
    
    data.forEach(response => {
        const roundData = response.round_data || [];
        if (!Array.isArray(roundData) || roundData.length < 2) return;
        
        const group = response.group === 'control' ? 'control' : 'treatment';
        
        // For each round after the first, look at previous round's outcome
        for (let i = 1; i < roundData.length; i++) {
            const prevRound = roundData[i - 1];
            const currRound = roundData[i];
            
            if (!prevRound || !currRound) continue;
            
            const prevWon = prevRound.won;
            const prevWinnings = parseFloat(prevRound.winnings) || 0;
            const nextBet = parseFloat(currRound.betAmount) || 0;
            
            if (isNaN(nextBet) || nextBet <= 0) continue;
            
            // Determine previous outcome
            let outcome;
            if (prevWinnings > 0) {
                outcome = 'win';
            } else if (prevWinnings < 0) {
                outcome = 'loss';
            } else {
                outcome = 'breakeven';
            }
            
            // Store the next-round bet amount
            if (dataMap[group] && dataMap[group][outcome]) {
                dataMap[group][outcome].push(nextBet);
            }
        }
    });
    
    // Calculate averages
    const chartData = [];
    const outcomes = ['win', 'loss', 'breakeven'];
    const outcomeLabels = { win: 'Win', loss: 'Loss', breakeven: 'Break-even' };
    
    outcomes.forEach(outcome => {
        const controlBets = dataMap.control[outcome];
        const treatmentBets = dataMap.treatment[outcome];
        
        const controlAvg = controlBets.length > 0 
            ? controlBets.reduce((sum, bet) => sum + bet, 0) / controlBets.length 
            : 0;
        const treatmentAvg = treatmentBets.length > 0 
            ? treatmentBets.reduce((sum, bet) => sum + bet, 0) / treatmentBets.length 
            : 0;
        
        chartData.push({
            outcome: outcomeLabels[outcome],
            control: controlAvg,
            treatment: treatmentAvg,
            controlCount: controlBets.length,
            treatmentCount: treatmentBets.length
        });
    });
    
    // Create D3.js grouped bar chart
    createPostOutcomeChart(container, chartData);
}

// Create D3.js grouped bar chart for post-outcome analysis
function createPostOutcomeChart(container, data) {
    // Set dimensions - standardized for dashboard
    const margin = { top: 50, right: 50, bottom: 70, left: 90 };
    // Get container width, with fallback for when container is not yet visible
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 
                          (container.parentElement?.clientWidth > 0 ? container.parentElement.clientWidth - 60 : 900);
    const width = Math.max(containerWidth - margin.left - margin.right, 600);
    const height = 450 - margin.top - margin.bottom;
    
    // Clear container
    container.innerHTML = '';
    
    // Check if we have any data
    const allValues = [
        ...data.map(d => d.control),
        ...data.map(d => d.treatment)
    ].filter(v => v !== null && !isNaN(v) && isFinite(v) && v > 0);
    
    if (allValues.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No valid data available for chart</p>';
        return;
    }
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Find min/max for Y-axis
    const yMin = 0;
    const yMax = Math.max(...allValues);
    const yPadding = yMax * 0.1 || 10;
    
    // Scales
    const x0Scale = d3.scaleBand()
        .domain(data.map(d => d.outcome))
        .range([0, width])
        .padding(0.2);
    
    const x1Scale = d3.scaleBand()
        .domain(['Control', 'Treatment'])
        .range([0, x0Scale.bandwidth()])
        .padding(0.05);
    
    const yScale = d3.scaleLinear()
        .domain([0, yMax + yPadding])
        .range([height, 0]);
    
    // X-axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(x0Scale))
        .selectAll('text')
        .attr('class', 'chart-axis')
        .style('font-size', '14px');
    
    // Y-axis
    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .attr('class', 'chart-axis')
        .style('font-size', '12px');
    
    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Average Next-Round Bet Amount ($)');
    
    // X-axis label
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + 50})`)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Previous Round Outcome');
    
    // Draw bars
    const groups = g.selectAll('.group')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'group')
        .attr('transform', d => `translate(${x0Scale(d.outcome)}, 0)`);
    
    // Control bars
    groups.append('rect')
        .attr('x', x1Scale('Control'))
        .attr('y', d => yScale(d.control))
        .attr('width', x1Scale.bandwidth())
        .attr('height', d => height - yScale(d.control))
        .attr('fill', '#1976d2')
        .attr('opacity', 0.8)
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            tooltip.show(event, `<strong>Control - ${d.outcome}</strong><div>Average Bet: $${d.control.toFixed(2)}</div><div>n: ${d.controlCount}</div>`);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    // Treatment bars
    groups.append('rect')
        .attr('x', x1Scale('Treatment'))
        .attr('y', d => yScale(d.treatment))
        .attr('width', x1Scale.bandwidth())
        .attr('height', d => height - yScale(d.treatment))
        .attr('fill', '#f57c00')
        .attr('opacity', 0.8)
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            tooltip.show(event, `<strong>Treatment - ${d.outcome}</strong><div>Average Bet: $${d.treatment.toFixed(2)}</div><div>n: ${d.treatmentCount}</div>`);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    // Add value labels on bars
    groups.selectAll('.value-label-control')
        .data(d => [d])
        .enter()
        .append('text')
        .attr('x', x1Scale('Control') + x1Scale.bandwidth() / 2)
        .attr('y', d => yScale(d.control) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#333')
        .style('font-weight', '600')
        .text(d => d.control > 0 ? '$' + d.control.toFixed(0) : '');
    
    groups.selectAll('.value-label-treatment')
        .data(d => [d])
        .enter()
        .append('text')
        .attr('x', x1Scale('Treatment') + x1Scale.bandwidth() / 2)
        .attr('y', d => yScale(d.treatment) - 5)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('fill', '#333')
        .style('font-weight', '600')
        .text(d => d.treatment > 0 ? '$' + d.treatment.toFixed(0) : '');
    
    // Add legend
    const legend = g.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);
    
    const legendData = [
        { label: 'Control', color: '#1976d2' },
        { label: 'Treatment', color: '#f57c00' }
    ];
    
    legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .each(function(d) {
            const g = d3.select(this);
            g.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', d.color)
                .attr('opacity', 0.8);
            g.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('font-size', '12px')
                .style('fill', '#333')
                .text(d.label);
        });
    
    // Add sample size info - place below the X-axis label, aligned right
    const infoText = g.append('g')
        .attr('transform', `translate(${width}, ${height + 60})`);
    
    data.forEach((d, i) => {
        if (d.controlCount > 0 || d.treatmentCount > 0) {
            infoText.append('text')
                .attr('y', i * 14)
                .attr('x', 0)
                .style('font-size', '11px')
                .style('fill', '#666')
                .style('text-anchor', 'end')
                .text(`${d.outcome}: Control n=${d.controlCount}, Treatment n=${d.treatmentCount}`);
        }
    });
}

// Create faceted charts by demographic subgroups
function updateFacetedCharts(data) {
    facetedChartData = data; // Store for dynamic updates
    
    // Set up selector event listener if not already set
    const selector = document.getElementById('facet-selector');
    if (selector && !selector.hasAttribute('data-listener-attached')) {
        selector.addEventListener('change', function() {
            // Use stored data for updates
            if (facetedChartData) {
                updateFacetedChartBySelection(facetedChartData);
            }
        });
        selector.setAttribute('data-listener-attached', 'true');
    }
    
    // Initial render
    updateFacetedChartBySelection(data);
}

// Update faceted chart based on selector value
function updateFacetedChartBySelection(data) {
    const selector = document.getElementById('facet-selector');
    const facetType = selector ? selector.value : 'gender';
    
    const container = document.getElementById('faceted-chart-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    let subgroupData, subgroupLabel;
    
    if (facetType === 'gender') {
        // Group data by gender
        subgroupData = {
            'Male': [],
            'Female': [],
            'Prefer not to say': []
        };
        
        data.forEach(response => {
            const demographics = response.demographics || {};
            const gender = demographics.sex || 'Unknown';
            if (subgroupData[gender]) {
                subgroupData[gender].push(response);
            }
        });
        subgroupLabel = 'Gender';
    } else {
        // Group data by gambling experience
        subgroupData = {
            'Yes': [],
            'No': []
        };
        
        data.forEach(response => {
            const demographics = response.demographics || {};
            const gambling = demographics.gambling || 'Unknown';
            if (subgroupData[gambling]) {
                subgroupData[gambling].push(response);
            }
        });
        subgroupLabel = 'Gambling Experience';
    }
    
    // Create faceted chart
    createFacetedChart(container, subgroupData, subgroupLabel);
}

// Create faceted chart with multiple panels
function createFacetedChart(container, subgroupData, subgroupLabel) {
    const subgroups = Object.keys(subgroupData).filter(key => subgroupData[key].length > 0);
    
    if (subgroups.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    // Calculate layout - responsive to container
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 
                          (container.parentElement?.clientWidth > 0 ? container.parentElement.clientWidth - 60 : 1000);
    const cols = subgroups.length <= 2 ? subgroups.length : 3;
    const rows = Math.ceil(subgroups.length / cols);
    const availableWidth = Math.max(containerWidth - 60, 800); // Account for padding, minimum width
    const panelWidth = Math.floor((availableWidth - (cols - 1) * 30) / cols);
    const panelHeight = 350;
    const panelMargin = 30;
    const totalWidth = cols * (panelWidth + panelMargin) - panelMargin;
    const totalHeight = rows * (panelHeight + panelMargin + 50) - panelMargin;
    
    // Create SVG
    const svg = d3.select(container)
        .append('svg')
        .attr('width', totalWidth)
        .attr('height', totalHeight);
    
    // Create a panel for each subgroup
    subgroups.forEach((subgroup, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * (panelWidth + panelMargin);
        const y = row * (panelHeight + panelMargin + 40);
        
        const panelData = subgroupData[subgroup];
        const chartData = calculatePostOutcomeData(panelData);
        
        // Panel title
        svg.append('text')
            .attr('x', x + panelWidth / 2)
            .attr('y', y + 20)
            .attr('text-anchor', 'middle')
            .style('font-size', '14px')
            .style('font-weight', '600')
            .style('fill', '#333')
            .text(`${subgroupLabel}: ${subgroup} (n=${panelData.length})`);
        
        // Create mini chart for this panel
        createFacetedPanel(svg, chartData, x, y + 30, panelWidth, panelHeight);
    });
}

// Calculate post-outcome data for a subset
function calculatePostOutcomeData(data) {
    const dataMap = {
        control: { win: [], loss: [], breakeven: [] },
        treatment: { win: [], loss: [], breakeven: [] }
    };
    
    data.forEach(response => {
        const roundData = response.round_data || [];
        if (!Array.isArray(roundData) || roundData.length < 2) return;
        
        const group = response.group === 'control' ? 'control' : 'treatment';
        
        for (let i = 1; i < roundData.length; i++) {
            const prevRound = roundData[i - 1];
            const currRound = roundData[i];
            
            if (!prevRound || !currRound) continue;
            
            const prevWinnings = parseFloat(prevRound.winnings) || 0;
            const nextBet = parseFloat(currRound.betAmount) || 0;
            
            if (isNaN(nextBet) || nextBet <= 0) continue;
            
            let outcome;
            if (prevWinnings > 0) {
                outcome = 'win';
            } else if (prevWinnings < 0) {
                outcome = 'loss';
            } else {
                outcome = 'breakeven';
            }
            
            if (dataMap[group] && dataMap[group][outcome]) {
                dataMap[group][outcome].push(nextBet);
            }
        }
    });
    
    const chartData = [];
    const outcomes = ['win', 'loss', 'breakeven'];
    const outcomeLabels = { win: 'Win', loss: 'Loss', breakeven: 'Break-even' };
    
    outcomes.forEach(outcome => {
        const controlBets = dataMap.control[outcome];
        const treatmentBets = dataMap.treatment[outcome];
        
        const controlAvg = controlBets.length > 0 
            ? controlBets.reduce((sum, bet) => sum + bet, 0) / controlBets.length 
            : 0;
        const treatmentAvg = treatmentBets.length > 0 
            ? treatmentBets.reduce((sum, bet) => sum + bet, 0) / treatmentBets.length 
            : 0;
        
        chartData.push({
            outcome: outcomeLabels[outcome],
            control: controlAvg,
            treatment: treatmentAvg,
            controlCount: controlBets.length,
            treatmentCount: treatmentBets.length
        });
    });
    
    return chartData;
}

// Create a single faceted panel (mini version of post-outcome chart)
function createFacetedPanel(svg, data, x, y, width, height) {
    const margin = { top: 10, right: 10, bottom: 40, left: 50 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
        .attr('transform', `translate(${x + margin.left},${y + margin.top})`);
    
    // Check if we have any data
    const allValues = [
        ...data.map(d => d.control),
        ...data.map(d => d.treatment)
    ].filter(v => v !== null && !isNaN(v) && isFinite(v) && v > 0);
    
    if (allValues.length === 0) {
        g.append('text')
            .attr('x', chartWidth / 2)
            .attr('y', chartHeight / 2)
            .attr('text-anchor', 'middle')
            .style('font-size', '12px')
            .style('fill', '#999')
            .text('No data');
        return;
    }
    
    const yMax = Math.max(...allValues);
    const yPadding = yMax * 0.1 || 10;
    
    // Scales
    const x0Scale = d3.scaleBand()
        .domain(data.map(d => d.outcome))
        .range([0, chartWidth])
        .padding(0.2);
    
    const x1Scale = d3.scaleBand()
        .domain(['Control', 'Treatment'])
        .range([0, x0Scale.bandwidth()])
        .padding(0.1);
    
    const yScale = d3.scaleLinear()
        .domain([0, yMax + yPadding])
        .range([chartHeight, 0]);
    
    // X-axis
    g.append('g')
        .attr('transform', `translate(0,${chartHeight})`)
        .call(d3.axisBottom(x0Scale))
        .selectAll('text')
        .style('font-size', '10px')
        .style('fill', '#666');
    
    // Y-axis
    g.append('g')
        .call(d3.axisLeft(yScale).ticks(4))
        .selectAll('text')
        .style('font-size', '9px')
        .style('fill', '#666');
    
    // Draw bars
    const groups = g.selectAll('.group')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'group')
        .attr('transform', d => `translate(${x0Scale(d.outcome)}, 0)`);
    
    // Control bars
    groups.append('rect')
        .attr('x', x1Scale('Control'))
        .attr('y', d => yScale(d.control))
        .attr('width', x1Scale.bandwidth())
        .attr('height', d => chartHeight - yScale(d.control))
        .attr('fill', '#1976d2')
        .attr('opacity', 0.8)
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
            tooltip.show(event, `<strong>Control - ${d.outcome}</strong><div>Average: $${d.control.toFixed(2)}</div><div>n: ${d.controlCount}</div>`);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    // Treatment bars
    groups.append('rect')
        .attr('x', x1Scale('Treatment'))
        .attr('y', d => yScale(d.treatment))
        .attr('width', x1Scale.bandwidth())
        .attr('height', d => chartHeight - yScale(d.treatment))
        .attr('fill', '#f57c00')
        .attr('opacity', 0.8)
        .attr('stroke', '#333')
        .attr('stroke-width', 0.5)
        .on('mouseover', function(event, d) {
            tooltip.show(event, `<strong>Treatment - ${d.outcome}</strong><div>Average: $${d.treatment.toFixed(2)}</div><div>n: ${d.treatmentCount}</div>`);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    // Add value labels (only if space allows)
    groups.selectAll('.value-label')
        .data(d => [
            { value: d.control, x: x1Scale('Control') + x1Scale.bandwidth() / 2 },
            { value: d.treatment, x: x1Scale('Treatment') + x1Scale.bandwidth() / 2 }
        ])
        .enter()
        .append('text')
        .attr('x', d => d.x)
        .attr('y', (d, i, nodes) => {
            const parentData = d3.select(nodes[i].parentNode).datum();
            return yScale(i === 0 ? parentData.control : parentData.treatment) - 3;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', '8px')
        .style('fill', '#333')
        .style('font-weight', '600')
        .text(d => d.value > 0 ? '$' + d.value.toFixed(0) : '');
}

// Update Risk Choice Chart (Stacked Bar)
function updateRiskChoiceChart(data) {
    const container = document.getElementById('risk-choice-chart-container');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    // Calculate risk choice percentages by group
    const controlRisky = [];
    const controlSafe = [];
    const treatmentRisky = [];
    const treatmentSafe = [];
    
    data.forEach(response => {
        const roundData = response.round_data || [];
        const group = response.group === 'control' ? 'control' : 'treatment';
        
        roundData.forEach(round => {
            if (round && round.risk) {
                if (group === 'control') {
                    if (round.risk === 'risky') {
                        controlRisky.push(1);
                    } else {
                        controlSafe.push(1);
                    }
                } else {
                    if (round.risk === 'risky') {
                        treatmentRisky.push(1);
                    } else {
                        treatmentSafe.push(1);
                    }
                }
            }
        });
    });
    
    const controlTotal = controlRisky.length + controlSafe.length;
    const treatmentTotal = treatmentRisky.length + treatmentSafe.length;
    
    const chartData = [
        {
            group: 'Control',
            risky: controlTotal > 0 ? (controlRisky.length / controlTotal) * 100 : 0,
            safe: controlTotal > 0 ? (controlSafe.length / controlTotal) * 100 : 0,
            riskyCount: controlRisky.length,
            safeCount: controlSafe.length
        },
        {
            group: 'Treatment',
            risky: treatmentTotal > 0 ? (treatmentRisky.length / treatmentTotal) * 100 : 0,
            safe: treatmentTotal > 0 ? (treatmentSafe.length / treatmentTotal) * 100 : 0,
            riskyCount: treatmentRisky.length,
            safeCount: treatmentSafe.length
        }
    ];
    
    createRiskChoiceChart(container, chartData);
}

// Create stacked bar chart for risk choice
function createRiskChoiceChart(container, data) {
    const margin = { top: 50, right: 50, bottom: 70, left: 90 };
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 
                          (container.parentElement?.clientWidth > 0 ? container.parentElement.clientWidth - 60 : 900);
    const width = Math.max(containerWidth - margin.left - margin.right, 600);
    const height = 450 - margin.top - margin.bottom;
    
    container.innerHTML = '';
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleBand()
        .domain(data.map(d => d.group))
        .range([0, width])
        .padding(0.3);
    
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
    
    // Color scale
    const colorScale = d3.scaleOrdinal()
        .domain(['risky', 'safe'])
        .range(['#f57c00', '#1976d2']);
    
    // Stack the data
    const stack = d3.stack()
        .keys(['risky', 'safe'])
        .order(d3.stackOrderNone)
        .offset(d3.stackOffsetExpand);
    
    const series = stack(data);
    
    // Draw bars
    const bars = g.selectAll('.bar-group')
        .data(series)
        .enter()
        .append('g')
        .attr('class', 'bar-group')
        .attr('fill', d => colorScale(d.key));
    
    bars.selectAll('rect')
        .data(d => d)
        .enter()
        .append('rect')
        .attr('x', d => xScale(d.data.group))
        .attr('y', d => yScale(d[1]))
        .attr('height', d => yScale(d[0]) - yScale(d[1]))
        .attr('width', xScale.bandwidth())
        .attr('opacity', 0.8)
        .attr('stroke', '#333')
        .attr('stroke-width', 1)
        .on('mouseover', function(event, d) {
            const pct = d[1] - d[0];
            const label = d.key === 'risky' ? 'Risky' : 'Safe';
            const count = d.key === 'risky' ? d.data.riskyCount : d.data.safeCount;
            tooltip.show(event, `<strong>${d.data.group} - ${label}</strong><div>Percentage: ${pct.toFixed(1)}%</div><div>Count: ${count}</div>`);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    // Add percentage labels
    bars.selectAll('.label')
        .data(d => d)
        .enter()
        .append('text')
        .attr('x', d => xScale(d.data.group) + xScale.bandwidth() / 2)
        .attr('y', d => (yScale(d[0]) + yScale(d[1])) / 2)
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '600')
        .style('fill', '#fff')
        .text(d => {
            const pct = d[1] - d[0];
            return pct > 5 ? pct.toFixed(1) + '%' : '';
        });
    
    // X-axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('font-size', '14px');
    
    // Y-axis
    g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + '%'))
        .selectAll('text')
        .style('font-size', '12px');
    
    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Percentage (%)');
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);
    
    const legendData = [
        { label: 'Risky', color: '#f57c00' },
        { label: 'Safe', color: '#1976d2' }
    ];
    
    legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .each(function(d) {
            const g = d3.select(this);
            g.append('rect')
                .attr('width', 15)
                .attr('height', 15)
                .attr('fill', d.color)
                .attr('opacity', 0.8);
            g.append('text')
                .attr('x', 20)
                .attr('y', 12)
                .style('font-size', '12px')
                .style('fill', '#333')
                .text(d.label);
        });
    
    // Add sample size info
    const infoText = g.append('g')
        .attr('transform', `translate(${width}, ${height + 50})`);
    
    data.forEach((d, i) => {
        infoText.append('text')
            .attr('y', i * 14)
            .attr('x', 0)
            .style('font-size', '11px')
            .style('fill', '#666')
            .style('text-anchor', 'end')
            .text(`${d.group}: Risky n=${d.riskyCount}, Safe n=${d.safeCount}`);
    });
}

// Update Risk Choice Over Rounds Chart (Line Plot)
function updateRiskRoundsChart(data) {
    const container = document.getElementById('risk-rounds-chart-container');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    // Calculate % risky by round and group
    const rounds = Array.from({ length: 12 }, (_, i) => i + 1);
    const chartData = rounds.map(roundNum => {
        const controlRisky = [];
        const controlTotal = [];
        const treatmentRisky = [];
        const treatmentTotal = [];
        
        data.forEach(response => {
            const roundData = response.round_data || [];
            const group = response.group === 'control' ? 'control' : 'treatment';
            
            if (roundData[roundNum - 1] && roundData[roundNum - 1].risk) {
                if (group === 'control') {
                    controlTotal.push(1);
                    if (roundData[roundNum - 1].risk === 'risky') {
                        controlRisky.push(1);
                    }
                } else {
                    treatmentTotal.push(1);
                    if (roundData[roundNum - 1].risk === 'risky') {
                        treatmentRisky.push(1);
                    }
                }
            }
        });
        
        return {
            round: roundNum,
            control: controlTotal.length > 0 ? (controlRisky.length / controlTotal.length) * 100 : 0,
            treatment: treatmentTotal.length > 0 ? (treatmentRisky.length / treatmentTotal.length) * 100 : 0,
            controlCount: controlTotal.length,
            treatmentCount: treatmentTotal.length
        };
    });
    
    createRiskRoundsChart(container, chartData);
}

// Create line chart for risk choice over rounds
function createRiskRoundsChart(container, data) {
    const margin = { top: 50, right: 50, bottom: 70, left: 90 };
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 
                          (container.parentElement?.clientWidth > 0 ? container.parentElement.clientWidth - 60 : 900);
    const width = Math.max(containerWidth - margin.left - margin.right, 600);
    const height = 450 - margin.top - margin.bottom;
    
    container.innerHTML = '';
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleLinear()
        .domain([1, 12])
        .range([0, width]);
    
    const yScale = d3.scaleLinear()
        .domain([0, 100])
        .range([height, 0]);
    
    // Line generator
    const line = d3.line()
        .x(d => xScale(d.round))
        .y(d => d.value)
        .curve(d3.curveMonotoneX);
    
    // Prepare data for lines
    const controlData = data.map(d => ({ round: d.round, value: d.control }));
    const treatmentData = data.map(d => ({ round: d.round, value: d.treatment }));
    
    // Draw lines
    g.append('path')
        .datum(controlData)
        .attr('fill', 'none')
        .attr('stroke', '#1976d2')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    g.append('path')
        .datum(treatmentData)
        .attr('fill', 'none')
        .attr('stroke', '#f57c00')
        .attr('stroke-width', 3)
        .attr('d', line);
    
    // Draw points
    g.selectAll('.control-point')
        .data(controlData)
        .enter()
        .append('circle')
        .attr('class', 'control-point')
        .attr('cx', d => xScale(d.round))
        .attr('cy', d => yScale(d.value))
        .attr('r', 5)
        .attr('fill', '#1976d2')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            const roundData = data.find(x => x.round === d.round);
            tooltip.show(event, `<strong>Control - Round ${d.round}</strong><div>% Risky: ${d.value.toFixed(1)}%</div><div>n: ${roundData ? roundData.controlCount : 0}</div>`);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    g.selectAll('.treatment-point')
        .data(treatmentData)
        .enter()
        .append('circle')
        .attr('class', 'treatment-point')
        .attr('cx', d => xScale(d.round))
        .attr('cy', d => yScale(d.value))
        .attr('r', 5)
        .attr('fill', '#f57c00')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .on('mouseover', function(event, d) {
            const roundData = data.find(x => x.round === d.round);
            tooltip.show(event, `<strong>Treatment - Round ${d.round}</strong><div>% Risky: ${d.value.toFixed(1)}%</div><div>n: ${roundData ? roundData.treatmentCount : 0}</div>`);
        })
        .on('mouseout', () => tooltip.hide())
        .on('mousemove', (event) => tooltip.move(event));
    
    // X-axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale).ticks(12).tickFormat(d => d))
        .selectAll('text')
        .style('font-size', '12px');
    
    // Y-axis
    g.append('g')
        .call(d3.axisLeft(yScale).ticks(5).tickFormat(d => d + '%'))
        .selectAll('text')
        .style('font-size', '12px');
    
    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Percentage Choosing Risky (%)');
    
    // X-axis label
    g.append('text')
        .attr('transform', `translate(${width / 2}, ${height + 50})`)
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Round Number');
    
    // Legend
    const legend = g.append('g')
        .attr('transform', `translate(${width - 150}, 20)`);
    
    const legendData = [
        { label: 'Control', color: '#1976d2' },
        { label: 'Treatment', color: '#f57c00' }
    ];
    
    legend.selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .each(function(d) {
            const g = d3.select(this);
            g.append('line')
                .attr('x1', 0)
                .attr('x2', 20)
                .attr('y1', 0)
                .attr('y2', 0)
                .attr('stroke', d.color)
                .attr('stroke-width', 3);
            g.append('text')
                .attr('x', 25)
                .attr('y', 4)
                .style('font-size', '12px')
                .style('fill', '#333')
                .text(d.label);
        });
}

// Update Betting Time Chart (Box Plot)
function updateBettingTimeChart(data) {
    const container = document.getElementById('betting-time-chart-container');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No data available for chart</p>';
        return;
    }
    
    // Collect betting times by group
    const controlTimes = [];
    const treatmentTimes = [];
    
    data.forEach(response => {
        const roundData = response.round_data || [];
        const group = response.group === 'control' ? 'control' : 'treatment';
        
        roundData.forEach(round => {
            if (round && round.bettingTime !== undefined && round.bettingTime !== null) {
                const time = parseFloat(round.bettingTime);
                if (!isNaN(time) && isFinite(time) && time > 0) {
                    if (group === 'control') {
                        controlTimes.push(time);
                    } else {
                        treatmentTimes.push(time);
                    }
                }
            }
        });
    });
    
    const chartData = [
        { group: 'Control', values: controlTimes },
        { group: 'Treatment', values: treatmentTimes }
    ];
    
    createBettingTimeChart(container, chartData);
}

// Create box plot for betting time
function createBettingTimeChart(container, data) {
    const margin = { top: 50, right: 50, bottom: 70, left: 90 };
    const containerWidth = container.clientWidth > 0 ? container.clientWidth : 
                          (container.parentElement?.clientWidth > 0 ? container.parentElement.clientWidth - 60 : 900);
    const width = Math.max(containerWidth - margin.left - margin.right, 600);
    const height = 450 - margin.top - margin.bottom;
    
    container.innerHTML = '';
    
    if (data.every(d => d.values.length === 0)) {
        container.innerHTML = '<p style="text-align: center; padding: 40px; color: #666;">No betting time data available</p>';
        return;
    }
    
    // Calculate box plot statistics
    function boxPlotStats(values) {
        if (values.length === 0) return null;
        
        const sorted = [...values].sort((a, b) => a - b);
        const q1 = d3.quantile(sorted, 0.25);
        const median = d3.quantile(sorted, 0.5);
        const q3 = d3.quantile(sorted, 0.75);
        const iqr = q3 - q1;
        const min = Math.max(sorted[0], q1 - 1.5 * iqr);
        const max = Math.min(sorted[sorted.length - 1], q3 + 1.5 * iqr);
        
        return { q1, median, q3, min, max, values: sorted };
    }
    
    const statsData = data.map(d => ({
        group: d.group,
        stats: boxPlotStats(d.values),
        count: d.values.length
    })).filter(d => d.stats !== null);
    
    const svg = d3.select(container)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom);
    
    const g = svg.append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleBand()
        .domain(statsData.map(d => d.group))
        .range([0, width])
        .padding(0.3);
    
    const allValues = statsData.flatMap(d => d.stats.values);
    const yMax = d3.max(allValues) || 100;
    const yScale = d3.scaleLinear()
        .domain([0, yMax * 1.1])
        .range([height, 0]);
    
    // Color scale
    const colorScale = d3.scaleOrdinal()
        .domain(['Control', 'Treatment'])
        .range(['#1976d2', '#f57c00']);
    
    // Draw box plots
    statsData.forEach((d, i) => {
        const x = xScale(d.group);
        const boxWidth = xScale.bandwidth();
        const stats = d.stats;
        
        // Whiskers
        g.append('line')
            .attr('x1', x + boxWidth / 2)
            .attr('x2', x + boxWidth / 2)
            .attr('y1', yScale(stats.min))
            .attr('y2', yScale(stats.max))
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
        
        // Box
        const boxGroup = g.append('g')
            .attr('class', 'box-plot-group');
        
        boxGroup.append('rect')
            .attr('x', x + boxWidth * 0.2)
            .attr('y', yScale(stats.q3))
            .attr('width', boxWidth * 0.6)
            .attr('height', yScale(stats.q1) - yScale(stats.q3))
            .attr('fill', colorScale(d.group))
            .attr('opacity', 0.7)
            .attr('stroke', '#333')
            .attr('stroke-width', 2)
            .on('mouseover', function(event) {
                const content = `<strong>${d.group}</strong>
                    <div>Q1: ${stats.q1.toFixed(2)}s</div>
                    <div>Median: ${stats.median.toFixed(2)}s</div>
                    <div>Q3: ${stats.q3.toFixed(2)}s</div>
                    <div>Min: ${stats.min.toFixed(2)}s</div>
                    <div>Max: ${stats.max.toFixed(2)}s</div>
                    <div>n: ${d.count}</div>`;
                tooltip.show(event, content);
            })
            .on('mouseout', () => tooltip.hide())
            .on('mousemove', (event) => tooltip.move(event));
        
        // Median line
        boxGroup.append('line')
            .attr('x1', x + boxWidth * 0.2)
            .attr('x2', x + boxWidth * 0.8)
            .attr('y1', yScale(stats.median))
            .attr('y2', yScale(stats.median))
            .attr('stroke', '#333')
            .attr('stroke-width', 2);
        
        // Outliers
        stats.values.forEach(value => {
            if (value < stats.min || value > stats.max) {
                g.append('circle')
                    .attr('cx', x + boxWidth / 2)
                    .attr('cy', yScale(value))
                    .attr('r', 3)
                    .attr('fill', colorScale(d.group))
                    .attr('stroke', '#333')
                    .attr('stroke-width', 1)
                    .on('mouseover', function(event) {
                        tooltip.show(event, `<strong>${d.group} - Outlier</strong><div>Time: ${value.toFixed(2)}s</div>`);
                    })
                    .on('mouseout', () => tooltip.hide())
                    .on('mousemove', (event) => tooltip.move(event));
            }
        });
    });
    
    // X-axis
    g.append('g')
        .attr('transform', `translate(0,${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .style('font-size', '14px');
    
    // Y-axis
    g.append('g')
        .call(d3.axisLeft(yScale))
        .selectAll('text')
        .style('font-size', '12px');
    
    // Y-axis label
    g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('y', -50)
        .attr('x', -height / 2)
        .attr('dy', '1em')
        .style('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('fill', '#333')
        .text('Time to Place Bet (seconds)');
    
    // Add sample size info
    const infoText = g.append('g')
        .attr('transform', `translate(${width}, ${height + 50})`);
    
    statsData.forEach((d, i) => {
        infoText.append('text')
            .attr('y', i * 14)
            .attr('x', 0)
            .style('font-size', '11px')
            .style('fill', '#666')
            .style('text-anchor', 'end')
            .text(`${d.group}: n=${d.count}`);
    });
}

// Show different dashboard sections
function showSection(sectionName, event) {
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Add active class to clicked button
    if (event && event.target) {
        event.target.classList.add('active');
    }
    
    // If visualizations is clicked, scroll to that section
    if (sectionName === 'visualizations') {
        const vizSection = document.getElementById('visualizations-section');
        if (vizSection) {
            vizSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Add a small offset for better visibility
            setTimeout(() => {
                window.scrollBy(0, -20);
            }, 100);
        }
    }
    // Aggregated data is always visible, no need to do anything
}

