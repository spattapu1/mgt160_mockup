// Survey state
let currentPage = 0;
const totalRounds = 12;
let balance = 100; // Starting balance
let roundData = []; // Store bet amount, risk choice, and outcome for each round
let roundConfigs = []; // Store randomized configurations for each round
let predeterminedOutcomes = []; // Store predetermined win/loss outcomes (6 wins, 6 losses)
let demographics = {
    sex: null,
    gambling: null
};

// Initialize the survey
document.addEventListener('DOMContentLoaded', function() {
    generateRoundConfigs();
    generatePredeterminedOutcomes();
    createSelectionPages();
    createOutcomePages();
    showPage(0);
});

// Generate predetermined outcomes: 6 wins, 6 losses, max 2 consecutive
function generatePredeterminedOutcomes() {
    // Create array with 6 wins and 6 losses
    const wins = Array(6).fill(true);
    const losses = Array(6).fill(false);
    const allOutcomes = [...wins, ...losses];
    
    // Shuffle with constraint: no more than 2 consecutive
    let shuffled = [];
    let consecutiveCount = 0;
    let lastOutcome = null;
    let remaining = [...allOutcomes];
    
    // Use a constraint-aware shuffle
    while (remaining.length > 0) {
        let validIndices = [];
        
        // Find indices that won't violate the constraint
        for (let i = 0; i < remaining.length; i++) {
            const candidate = remaining[i];
            // Check if selecting this would create more than 2 consecutive
            const wouldViolate = (lastOutcome === candidate && consecutiveCount >= 2);
            if (!wouldViolate) {
                validIndices.push(i);
            }
        }
        
        // If no valid indices (shouldn't happen with balanced 6-6), use all
        if (validIndices.length === 0) {
            validIndices = Array.from({length: remaining.length}, (_, i) => i);
        }
        
        // Pick random from valid indices
        const randomIndex = validIndices[Math.floor(Math.random() * validIndices.length)];
        const selected = remaining.splice(randomIndex, 1)[0];
        
        // Update consecutive count
        if (selected === lastOutcome) {
            consecutiveCount++;
        } else {
            consecutiveCount = 1;
            lastOutcome = selected;
        }
        
        shuffled.push(selected);
    }
    
    // Verify the result
    let winCount = shuffled.filter(x => x === true).length;
    let lossCount = shuffled.filter(x => x === false).length;
    
    // Check for more than 2 consecutive
    let hasMoreThanTwoConsecutive = false;
    for (let i = 0; i < shuffled.length - 2; i++) {
        if (shuffled[i] === shuffled[i+1] && shuffled[i+1] === shuffled[i+2]) {
            hasMoreThanTwoConsecutive = true;
            break;
        }
    }
    
    // If verification fails, use a fallback pattern
    if (winCount !== 6 || lossCount !== 6 || hasMoreThanTwoConsecutive) {
        // Fallback: create a valid pattern manually
        shuffled = [true, true, false, false, true, false, true, false, true, false, true, false];
        // Shuffle while maintaining constraint
        for (let i = 0; i < 200; i++) {
            const idx1 = Math.floor(Math.random() * 12);
            const idx2 = Math.floor(Math.random() * 12);
            if (idx1 !== idx2) {
                // Check if swap maintains constraint
                const temp = shuffled[idx1];
                shuffled[idx1] = shuffled[idx2];
                shuffled[idx2] = temp;
                
                // Check constraint and counts
                let valid = true;
                let tempWinCount = shuffled.filter(x => x === true).length;
                let tempLossCount = shuffled.filter(x => x === false).length;
                
                if (tempWinCount !== 6 || tempLossCount !== 6) {
                    valid = false;
                }
                
                // Check for more than 2 consecutive
                for (let j = 0; j < shuffled.length - 2; j++) {
                    if (shuffled[j] === shuffled[j+1] && shuffled[j+1] === shuffled[j+2]) {
                        valid = false;
                        break;
                    }
                }
                
                if (!valid) {
                    // Revert swap
                    shuffled[idx2] = shuffled[idx1];
                    shuffled[idx1] = temp;
                }
            }
        }
    }
    
    predeterminedOutcomes = shuffled;
}

// Generate fake game/match names and return team pair
function generateGameName(round) {
    const teamNames = [
        ['Thunderbolts', 'Lightning'],
        ['Wildcats', 'Eagles'],
        ['Sharks', 'Dolphins'],
        ['Tigers', 'Lions'],
        ['Wolves', 'Bears'],
        ['Falcons', 'Hawks'],
        ['Dragons', 'Phoenix'],
        ['Vikings', 'Warriors'],
        ['Panthers', 'Jaguars'],
        ['Stallions', 'Mustangs'],
        ['Cobras', 'Vipers'],
        ['Ravens', 'Crows'],
        ['Titans', 'Giants'],
        ['Spartans', 'Gladiators'],
        ['Knights', 'Crusaders'],
        ['Pirates', 'Buccaneers'],
        ['Storm', 'Hurricanes'],
        ['Blazers', 'Flames'],
        ['Rockets', 'Comets'],
        ['Stars', 'Galaxy']
    ];
    
    // Use round number to pick teams (with some randomization)
    const teamPair = teamNames[(round - 1) % teamNames.length];
    const shuffled = [...teamPair].sort(() => Math.random() - 0.5);
    return {
        display: `${shuffled[0]} vs ${shuffled[1]}`,
        team1: shuffled[0],
        team2: shuffled[1]
    };
}

// Generate randomized configurations for each round
function generateRoundConfigs() {
    for (let i = 0; i < totalRounds; i++) {
        // Randomize probabilities and multipliers
        // Safe option: 60-80% win chance, 1x-2x multiplier
        // Risky option: 20-40% win chance, 2x-5x multiplier
        
        const safeWinChance = 0.60 + Math.random() * 0.20; // 60-80%
        const safeMultiplier = 1 + Math.random(); // 1x-2x
        
        const riskyWinChance = 0.20 + Math.random() * 0.20; // 20-40%
        const riskyMultiplier = 2 + Math.random() * 3; // 2x-5x
        
        // Generate game name and teams for this round
        const gameInfo = generateGameName(i + 1);
        
        // Randomly assign teams to safe or risky options
        const team1IsSafe = Math.random() < 0.5;
        const safeTeam = team1IsSafe ? gameInfo.team1 : gameInfo.team2;
        const riskyTeam = team1IsSafe ? gameInfo.team2 : gameInfo.team1;
        
        // Randomize which option appears first
        const order = Math.random() < 0.5 ? ['safe', 'risky'] : ['risky', 'safe'];
        
        roundConfigs[i] = {
            gameName: gameInfo.display,
            safe: {
                winChance: safeWinChance,
                multiplier: safeMultiplier,
                name: safeTeam,
                team: safeTeam
            },
            risky: {
                winChance: riskyWinChance,
                multiplier: riskyMultiplier,
                name: riskyTeam,
                team: riskyTeam
            },
            order: order
        };
    }
}

// Create selection pages for all rounds
function createSelectionPages() {
    const container = document.getElementById('selection-pages');
    
    for (let i = 1; i <= totalRounds; i++) {
        const config = roundConfigs[i - 1];
        const safeConfig = config.safe;
        const riskyConfig = config.risky;
        const order = config.order;
        
        // Calculate percentages for display
        const safeWinPercent = Math.round(safeConfig.winChance * 100);
        const safeLosePercent = 100 - safeWinPercent;
        const riskyWinPercent = Math.round(riskyConfig.winChance * 100);
        const riskyLosePercent = 100 - riskyWinPercent;
        
        // Create risk options based on randomized order
        let riskOptionsHTML = '';
        if (order[0] === 'safe') {
            riskOptionsHTML = `
                <div class="risk-option" id="safe-${i}" onclick="selectRisk(${i}, 'safe', this)">
                    <div class="risk-title">${safeConfig.name}</div>
                    <div class="risk-details" id="safe-details-${i}">${safeWinPercent}% chance to win +$b, ${safeLosePercent}% lose –$b</div>
                </div>
                <div class="risk-option" id="risky-${i}" onclick="selectRisk(${i}, 'risky', this)">
                    <div class="risk-title">${riskyConfig.name}</div>
                    <div class="risk-details" id="risky-details-${i}">${riskyWinPercent}% chance to win +$${riskyConfig.multiplier.toFixed(1)}b, ${riskyLosePercent}% lose –$b</div>
                </div>
            `;
        } else {
            riskOptionsHTML = `
                <div class="risk-option" id="risky-${i}" onclick="selectRisk(${i}, 'risky', this)">
                    <div class="risk-title">${riskyConfig.name}</div>
                    <div class="risk-details" id="risky-details-${i}">${riskyWinPercent}% chance to win +$${riskyConfig.multiplier.toFixed(1)}b, ${riskyLosePercent}% lose –$b</div>
                </div>
                <div class="risk-option" id="safe-${i}" onclick="selectRisk(${i}, 'safe', this)">
                    <div class="risk-title">${safeConfig.name}</div>
                    <div class="risk-details" id="safe-details-${i}">${safeWinPercent}% chance to win +$b, ${safeLosePercent}% lose –$b</div>
                </div>
            `;
        }
        
        const page = document.createElement('div');
        page.className = 'page';
        page.id = `selection-page-${i}`;
        
        page.innerHTML = `
            <div class="round-indicator">Round ${i} of ${totalRounds}</div>
            <div class="balance-display" id="balance-display-${i}">Current Balance: $${balance}</div>
            <div class="game-name">${config.gameName}</div>
            <div class="selection-content">
                <h2>Round ${i}: Make Your Bet</h2>
                <div class="bet-section">
                    <label for="bet-amount-${i}" class="bet-label">Enter Your Bet Amount:</label>
                    <input type="number" id="bet-amount-${i}" class="bet-input" min="1" max="${balance}" step="1" oninput="validateBet(${i})" placeholder="Enter amount">
                </div>
                <div class="risk-section">
                    <p class="risk-label">Choose a risk option:</p>
                    <div class="risk-options">
                        ${riskOptionsHTML}
                    </div>
                </div>
                <button class="next-btn" id="selection-next-${i}" onclick="saveAndNext(${i})" disabled>Next</button>
            </div>
        `;
        
        container.appendChild(page);
    }
}

// Create outcome pages for all rounds
function createOutcomePages() {
    const container = document.getElementById('outcome-pages');
    
    for (let i = 1; i <= totalRounds; i++) {
        const page = document.createElement('div');
        page.className = 'page';
        page.id = `outcome-page-${i}`;
        
            const config = roundConfigs[i - 1];
            page.innerHTML = `
            <div class="round-indicator">Round ${i} of ${totalRounds}</div>
            <div class="balance-display" id="balance-display-outcome-${i}">Current Balance: $${balance}</div>
            <div class="game-name">${config ? config.gameName : 'Game'}</div>
            <div class="outcome-content">
                <h2>Round ${i}: Outcome</h2>
                <div class="outcome-box">
                    <p id="outcome-text-${i}">Loading outcome...</p>
                </div>
                <button class="next-btn" onclick="nextPage()">Next</button>
            </div>
        `;
        
        container.appendChild(page);
    }
}

// Validate bet amount
function validateBet(round) {
    const betInput = document.getElementById(`bet-amount-${round}`);
    const betAmountValue = betInput.value.trim();
    const betAmount = parseInt(betAmountValue, 10);
    const nextBtn = document.getElementById(`selection-next-${round}`);
    
    // Update risk details with actual bet amount
    updateRiskDetails(round, betAmount);
    
    // Check if bet is valid and risk is selected
    const riskSelected = roundData[round - 1] && roundData[round - 1].risk;
    const isValidBet = !isNaN(betAmount) && betAmount > 0 && betAmount <= balance && Number.isInteger(betAmount);
    
    if (isValidBet && riskSelected) {
        nextBtn.disabled = false;
        if (!roundData[round - 1]) {
            roundData[round - 1] = {};
        }
        // Ensure betAmount is stored as a number
        roundData[round - 1].betAmount = Number(betAmount);
        roundData[round - 1].risk = roundData[round - 1].risk || null; // Keep existing risk if set
    } else {
        nextBtn.disabled = true;
    }
}

// Update risk details with actual bet amount
function updateRiskDetails(round, betAmount) {
    const config = roundConfigs[round - 1];
    const safeConfig = config.safe;
    const riskyConfig = config.risky;
    
    const safeDetails = document.getElementById(`safe-details-${round}`);
    const riskyDetails = document.getElementById(`risky-details-${round}`);
    
    if (!isNaN(betAmount) && betAmount > 0 && Number.isInteger(betAmount)) {
        const safeWinAmount = Math.round(betAmount * safeConfig.multiplier);
        const riskyWinAmount = Math.round(betAmount * riskyConfig.multiplier);
        const safeWinPercent = Math.round(safeConfig.winChance * 100);
        const safeLosePercent = 100 - safeWinPercent;
        const riskyWinPercent = Math.round(riskyConfig.winChance * 100);
        const riskyLosePercent = 100 - riskyWinPercent;
        
        if (safeDetails) {
            safeDetails.textContent = `${safeWinPercent}% chance to win +$${safeWinAmount}, ${safeLosePercent}% lose –$${betAmount}`;
        }
        if (riskyDetails) {
            riskyDetails.textContent = `${riskyWinPercent}% chance to win +$${riskyWinAmount}, ${riskyLosePercent}% lose –$${betAmount}`;
        }
    } else {
        // Show template with "b" placeholder
        const safeWinPercent = Math.round(safeConfig.winChance * 100);
        const safeLosePercent = 100 - safeWinPercent;
        const riskyWinPercent = Math.round(riskyConfig.winChance * 100);
        const riskyLosePercent = 100 - riskyWinPercent;
        
        if (safeDetails) {
            safeDetails.textContent = `${safeWinPercent}% chance to win +$b, ${safeLosePercent}% lose –$b`;
        }
        if (riskyDetails) {
            riskyDetails.textContent = `${riskyWinPercent}% chance to win +$${riskyConfig.multiplier.toFixed(1)}b, ${riskyLosePercent}% lose –$b`;
        }
    }
}

// Handle risk selection
function selectRisk(round, riskType, element) {
    // Remove previous selection for this round
    const safeOption = document.getElementById(`safe-${round}`);
    const riskyOption = document.getElementById(`risky-${round}`);
    safeOption.classList.remove('selected');
    riskyOption.classList.remove('selected');
    
    // Mark selected option
    element.classList.add('selected');
    
    // Store selection
    if (!roundData[round - 1]) {
        roundData[round - 1] = {};
    }
    roundData[round - 1].risk = riskType;
    
    // Check if we can enable next button
    const betInput = document.getElementById(`bet-amount-${round}`);
    if (betInput) {
        const betAmountValue = betInput.value.trim();
        const betAmount = parseInt(betAmountValue, 10);
        const isValidBet = !isNaN(betAmount) && betAmount > 0 && betAmount <= balance && Number.isInteger(betAmount);
        
        if (isValidBet) {
            document.getElementById(`selection-next-${round}`).disabled = false;
            // Also store the bet amount if valid
            roundData[round - 1].betAmount = Number(betAmount);
        }
    }
}

// Show outcome for a round
function showOutcome(round) {
    const outcomeText = document.getElementById(`outcome-text-${round}`);
    const balanceDisplay = document.getElementById(`balance-display-outcome-${round}`);
    
    if (!outcomeText) {
        console.error(`Outcome text element not found for round ${round}`);
        return;
    }
    
    // Check if we have the required data
    const roundInfo = roundData[round - 1];
    if (!roundInfo) {
        outcomeText.innerHTML = '<p style="color: #dc3545;">Error: No bet data found. Please go back and make your selection.</p>';
        return;
    }
    
    if (!roundInfo.betAmount || !roundInfo.risk) {
        outcomeText.innerHTML = '<p style="color: #dc3545;">Error: Incomplete bet data. Please go back and complete your bet selection.</p>';
        return;
    }
    
    const config = roundConfigs[round - 1];
    if (!config) {
        if (outcomeText) {
            outcomeText.innerHTML = '<p style="color: #dc3545;">Error: Configuration not found.</p>';
        }
        return;
    }
    
    const betAmount = Number(roundInfo.betAmount);
    const riskType = roundInfo.risk;
    
    // Validate values
    if (isNaN(betAmount) || betAmount <= 0 || !config[riskType]) {
        if (outcomeText) {
            outcomeText.innerHTML = '<p style="color: #dc3545;">Error: Invalid bet data.</p>';
        }
        return;
    }
    
    // Get the configuration for the selected risk type
    const riskConfig = config[riskType];
    
    // Calculate outcome only if not already calculated (to prevent recalculation)
    let won, winnings, balanceBefore;
    
    if (roundInfo.outcomeCalculated) {
        // Use stored outcome
        won = roundInfo.won;
        winnings = Number(roundInfo.winnings);
        balanceBefore = Number(roundInfo.balanceBefore);
    } else {
        // Calculate outcome for the first time
        balanceBefore = Number(balance); // Store balance before the bet
        
        // Use predetermined outcome instead of random
        won = predeterminedOutcomes[round - 1];
        
        if (won) {
            // Win: get the multiplier amount
            winnings = Math.round(betAmount * riskConfig.multiplier);
        } else {
            // Lose: lose the bet amount
            winnings = -betAmount;
        }
        
        // Update balance
        balance = Number(balance) + Number(winnings);
        if (isNaN(balance)) {
            balance = 100; // Reset if somehow NaN
        }
        
        // Store outcome data
        roundInfo.winnings = winnings;
        roundInfo.won = won;
        roundInfo.balanceBefore = balanceBefore;
        roundInfo.outcomeCalculated = true;
    }
    
    const balanceAfter = Number(balance);
    
    // Ensure all values are valid numbers
    const displayBetAmount = isNaN(betAmount) ? 0 : betAmount;
    const displayBalanceBefore = isNaN(balanceBefore) ? 100 : balanceBefore;
    const displayWinnings = isNaN(winnings) ? 0 : winnings;
    const displayBalanceAfter = isNaN(balanceAfter) ? 100 : balanceAfter;
    
    // Display outcome with clear calculation breakdown
    if (won) {
        outcomeText.innerHTML = `
            <strong style="color: #28a745; font-size: 1.3em;">You Won!</strong><br><br>
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                <p><strong>Bet Details:</strong></p>
                <p>You bet $${displayBetAmount} on ${riskConfig.name}</p>
                <p style="margin-top: 15px;"><strong>Calculation:</strong></p>
                <p>Balance before bet: $${displayBalanceBefore}</p>
                <p>Your winnings: <strong style="color: #28a745;">+$${Math.abs(displayWinnings)}</strong></p>
                <p style="margin-top: 10px; font-size: 1.1em; border-top: 2px solid #28a745; padding-top: 10px;">
                    Balance after bet: <strong style="color: #28a745;">$${displayBalanceAfter}</strong>
                </p>
            </div>
        `;
    } else {
        outcomeText.innerHTML = `
            <strong style="color: #dc3545; font-size: 1.3em;">You Lost</strong><br><br>
            <div style="text-align: left; max-width: 400px; margin: 0 auto;">
                <p><strong>Bet Details:</strong></p>
                <p>You bet $${displayBetAmount} on ${riskConfig.name}</p>
                <p style="margin-top: 15px;"><strong>Calculation:</strong></p>
                <p>Balance before bet: $${displayBalanceBefore}</p>
                <p>Your loss: <strong style="color: #dc3545;">-$${Math.abs(displayWinnings)}</strong></p>
                <p style="margin-top: 10px; font-size: 1.1em; border-top: 2px solid #dc3545; padding-top: 10px;">
                    Balance after bet: <strong style="color: #dc3545;">$${displayBalanceAfter}</strong>
                </p>
            </div>
        `;
    }
    
    // Update balance display
    if (balanceDisplay) {
        const displayBalance = Number(balanceAfter);
        if (!isNaN(displayBalance)) {
            balanceDisplay.textContent = `Current Balance: $${displayBalance}`;
        } else {
            balanceDisplay.textContent = `Current Balance: $100`;
        }
    }
}

// Save bet data and navigate to next page
function saveAndNext(round) {
    // Ensure bet data is saved before navigating
    const betInput = document.getElementById(`bet-amount-${round}`);
    if (betInput) {
        const betAmountValue = betInput.value.trim();
        const betAmount = parseInt(betAmountValue, 10);
        if (!isNaN(betAmount) && betAmount > 0) {
            if (!roundData[round - 1]) {
                roundData[round - 1] = {};
            }
            roundData[round - 1].betAmount = Number(betAmount);
        }
    }
    nextPage();
}

// Update demographics data and enable/disable next button
function updateDemographics() {
    const sexSelected = document.querySelector('input[name="sex"]:checked');
    const gamblingSelected = document.querySelector('input[name="gambling"]:checked');
    const nextBtn = document.getElementById('demographics-next');
    
    if (sexSelected) {
        demographics.sex = sexSelected.value;
    }
    if (gamblingSelected) {
        demographics.gambling = gamblingSelected.value;
    }
    
    // Enable next button if both questions are answered
    if (sexSelected && gamblingSelected && nextBtn) {
        nextBtn.disabled = false;
    } else if (nextBtn) {
        nextBtn.disabled = true;
    }
}

// Navigate to next page
function nextPage() {
    currentPage++;
    
    // Calculate total pages: 1 instruction + 1 demographics + (12 rounds × 2 pages) = 26 pages
    const totalPages = 2 + (totalRounds * 2);
    
    if (currentPage >= totalPages) {
        // Survey complete
        showPage('completion');
    } else {
        showPage(currentPage);
    }
}

// Show specific page
function showPage(pageIndex) {
    // Hide all pages
    const allPages = document.querySelectorAll('.page');
    allPages.forEach(page => page.classList.remove('active'));
    
    if (pageIndex === 0) {
        // Instruction page
        document.getElementById('instruction-page').classList.add('active');
    } else if (pageIndex === 1) {
        // Demographics page
        document.getElementById('demographics-page').classList.add('active');
    } else if (pageIndex === 'completion') {
        // Completion page
        document.getElementById('completion-page').classList.add('active');
    } else {
        // Page flow: 
        // Page 0: instruction
        // Page 1: demographics
        // Page 2: Round 1 Selection
        // Page 3: Round 1 Outcome
        // Page 4: Round 2 Selection
        // Page 5: Round 2 Outcome
        // ... and so on
        
        // For page index n (where n >= 2):
        // Adjust for demographics page: subtract 2
        const adjustedIndex = pageIndex - 2;
        
        // Odd adjusted indices (0, 2, 4, ...) are selection pages
        // Even adjusted indices (1, 3, 5, ...) are outcome pages
        
        if (adjustedIndex % 2 === 0) {
            // Even adjusted index = Selection page
            // Round number = (adjustedIndex / 2) + 1
            const round = (adjustedIndex / 2) + 1;
            updateBalanceDisplay(round);
            document.getElementById(`selection-page-${round}`).classList.add('active');
        } else {
            // Odd adjusted index = Outcome page
            // Round number = ((adjustedIndex - 1) / 2) + 1
            const round = ((adjustedIndex - 1) / 2) + 1;
            showOutcome(round);
            document.getElementById(`outcome-page-${round}`).classList.add('active');
        }
    }
}

// Update balance display on selection page
function updateBalanceDisplay(round) {
    const balanceDisplay = document.getElementById(`balance-display-${round}`);
    if (balanceDisplay) {
        const currentBalance = Number(balance);
        if (!isNaN(currentBalance)) {
            balanceDisplay.textContent = `Current Balance: $${currentBalance}`;
        } else {
            balanceDisplay.textContent = `Current Balance: $100`;
        }
    }
    
    // Update max bet amount
    const betInput = document.getElementById(`bet-amount-${round}`);
    if (betInput) {
        const currentBalance = Number(balance);
        if (!isNaN(currentBalance)) {
            betInput.max = currentBalance;
            const currentBetValue = betInput.value.trim();
            const currentBet = parseInt(currentBetValue, 10);
            if (!isNaN(currentBet) && currentBet > currentBalance) {
                betInput.value = '';
                document.getElementById(`selection-next-${round}`).disabled = true;
            }
        }
    }
}

