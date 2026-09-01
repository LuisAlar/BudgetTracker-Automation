import { 
    DEFAULT_BUDGET_CONFIG, 
    resolveAllocations, 
    calculateNextCushions, 
    getExperiencesSubTagBreakdown, 
    calculateSpendingAnalytics, 
    BudgetConfig
} from "./dataService";
import { Transaction } from "../models";

// Helper to run a test block and report results
let testsRun = 0;
let testsFailed = 0;

function describe(name: string, fn: () => void) {
    console.log(`\n📦 Suite: ${name}`);
    fn();
}

function test(name: string, fn: () => void) {
    testsRun++;
    try {
        fn();
        console.log(`  ✅ Passed: ${name}`);
    } catch (e) {
        testsFailed++;
        console.error(`  ❌ Failed: ${name}`);
        console.error(e);
    }
}

function assert(condition: boolean, message: string) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertEqual(actual: any, expected: any, message: string) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message} (Expected ${expected}, got ${actual})`);
    }
}

function assertAlmostEqual(actual: number, expected: number, message: string, precision: number = 0.01) {
    if (Math.abs(actual - expected) > precision) {
        throw new Error(`Assertion failed: ${message} (Expected ~${expected}, got ${actual})`);
    }
}

// Start testing suite
describe("Budget Allocations", () => {
    test("Should compute absolute allocations correctly from income and percentages/fixed", () => {
        const config: BudgetConfig = {
            weekly_income: 850.0,
            initial_seed_balance: 1900.0,
            buckets: {
                "Groceries": { percentage: 14.70588, fixed_amount: null },
                "Gas": { percentage: 4.70588, fixed_amount: null },
                "Subscriptions": { percentage: null, fixed_amount: 15.0 },
                "Experiences": { percentage: 15.29412, fixed_amount: null },
                "District Savings": { percentage: 41.17647, fixed_amount: null },
                "Simulated Housing": { percentage: null, fixed_amount: 190.0 }
            },
            rollover_rules: {},
            allocations: {}
        };
        
        const allocations = resolveAllocations(config.weekly_income, config.buckets);
        
        assertAlmostEqual(allocations["Groceries"] || 0, 125.00, "Groceries should resolve to $125.00");
        assertAlmostEqual(allocations["Gas"] || 0, 40.00, "Gas should resolve to $40.00");
        assertEqual(allocations["Subscriptions"] || 0, 15.00, "Subscriptions should resolve to exactly $15.00");
        assertAlmostEqual(allocations["Experiences"] || 0, 130.00, "Experiences should resolve to $130.00");
        assertAlmostEqual(allocations["District Savings"] || 0, 350.00, "District Savings should resolve to $350.00");
        assertEqual(allocations["Simulated Housing"] || 0, 190.00, "Simulated Housing should resolve to exactly $190.00");
    });
});

describe("Worth-It Rollover Thresholds", () => {
    const config = DEFAULT_BUDGET_CONFIG;
    
    test("Should NOT roll over if unspent leftover is below or equal to threshold", () => {
        // Groceries allocation is $125. Spent $121.50 -> Leftover = $3.50.
        // Threshold is $5.00. Leftover $3.50 <= $5.00 threshold -> Rollover cushion should be $0.00
        const expensesByCategory = {
            "Groceries": { total: 121.50 }
        };
        const currentCushions = {
            "Groceries": 0
        };
        
        const nextCushions = calculateNextCushions(expensesByCategory, config, currentCushions);
        
        assertEqual(nextCushions["Groceries"] || 0, 0, "Leftover below threshold should NOT roll over");
    });

    test("Should roll over 100% if unspent leftover is above threshold", () => {
        // Groceries allocation is $125. Spent $80.00 -> Leftover = $45.00.
        // Threshold is $5.00. Leftover $45.00 > $5.00 threshold -> Rollover cushion should be $45.00
        const expensesByCategory = {
            "Groceries": { total: 80.00 }
        };
        const currentCushions = {
            "Groceries": 0
        };
        
        const nextCushions = calculateNextCushions(expensesByCategory, config, currentCushions);
        
        assertEqual(nextCushions["Groceries"] || 0, 45.00, "Leftover above threshold should roll over completely");
    });

    test("Should process deficit payback and ignore threshold check for deficits", () => {
        // Groceries allocation is $125. Spent $140.00 -> Deficit = -$15.00.
        // Deficit should carry over fully as -$15.00 regardless of threshold
        const expensesByCategory = {
            "Groceries": { total: 140.00 }
        };
        const currentCushions = {
            "Groceries": 0
        };
        
        const nextCushions = calculateNextCushions(expensesByCategory, config, currentCushions);
        
        assertEqual(nextCushions["Groceries"] || 0, -15.00, "Deficit must carry over fully");
    });
    
    test("Should sweep unspent Simulated Housing fully to savings", () => {
        // Simulated Housing allocation is $190. Spent $95 (Scenario B). Leftover = $95.
        // Should sweep 100% of unspent $95 to District Savings, and 0% to Simulated Housing.
        const expensesByCategory = {
            "Simulated Housing": { total: 95.00 },
            "Experiences": { total: 130.00 },
            "Gas": { total: 40.00 },
            "Groceries": { total: 125.00 }
        };
        const currentCushions = {
            "Simulated Housing": 0,
            "District Savings": 0
        };
        
        const nextCushions = calculateNextCushions(expensesByCategory, config, currentCushions);

        
        assertEqual(nextCushions["Simulated Housing"] || 0, 0, "Simulated Housing should have 0% rollover");
        assertEqual(nextCushions["District Savings"] || 0, 95.00, "District Savings should receive 100% of swept housing leftover");
    });
});

describe("Experiences Bucket Sub-Tag Parsing", () => {
    test("Should group Experiences transactions correctly using hashtags or keywords in notes", () => {
        const txs: Transaction[] = [
            {
                transaction_id: "tx1",
                amount: 35.00,
                merchant: "Chipotle",
                category: "Experiences",
                date_logged: "2026-05-18T12:00:00Z",
                notes: "Dinner with friends"
            },
            {
                transaction_id: "tx2",
                amount: 40.00,
                merchant: "World Cup Bar",
                category: "Experiences",
                date_logged: "2026-05-19T12:00:00Z",
                notes: "Mexico vs Poland game #worldcup #wc"
            },
            {
                transaction_id: "tx3",
                amount: 15.00,
                merchant: "Corner Shop",
                category: "Experiences",
                date_logged: "2026-05-20T12:00:00Z",
                notes: "wraps and snacks #za"
            },
            {
                transaction_id: "tx4",
                amount: 25.00,
                merchant: "Stereo Live",
                category: "Experiences",
                date_logged: "2026-05-21T12:00:00Z",
                notes: "Underground dj concert #rave"
            }
        ];
        
        const breakdown = getExperiencesSubTagBreakdown(txs, DEFAULT_BUDGET_CONFIG);
        
        // Find categories
        const wc = breakdown.find(b => b.tag === "World Cup");
        const za = breakdown.find(b => b.tag === "Za & Wraps");
        const rave = breakdown.find(b => b.tag === "Raves & Music");
        const fallback = breakdown.find(b => b.tag === "Dining Out & Spontaneous");
        
        assert(!!wc, "World Cup category should exist");
        assertEqual(wc!.total, 40.00, "World Cup should total $40.00");
        assertEqual(wc!.count, 1, "World Cup should have 1 transaction");
        assertEqual(wc!.percentage, 34.8, "World Cup should be 34.8% of Experiences");
        
        assert(!!za, "Za & Wraps category should exist");
        assertEqual(za!.total, 15.00, "Za & Wraps should total $15.00");
        
        assert(!!rave, "Raves & Music category should exist");
        assertEqual(rave!.total, 25.00, "Raves & Music should total $25.00");
        
        assert(!!fallback, "Fallback dining category should exist");
        assertEqual(fallback!.total, 35.00, "Fallback dining should total $35.00");
    });
});

describe("Spending Analytics Engine", () => {
    test("Should calculate weekly averages, swipe frequencies, and budget adjustment recommendations", () => {
        // Log transactions representing a 2-week history
        const txs: Transaction[] = [
            // Week 1
            { transaction_id: "1", amount: 110.00, merchant: "HEB Groceries", category: "Groceries", date_logged: "2026-05-11T12:00:00Z", notes: "" },
            { transaction_id: "2", amount: 30.00, merchant: "Chevron", category: "Gas", date_logged: "2026-05-12T12:00:00Z", notes: "" },
            { transaction_id: "3", amount: 15.00, merchant: "Netflix", category: "Subscriptions", date_logged: "2026-05-13T12:00:00Z", notes: "" },
            { transaction_id: "4", amount: 180.00, merchant: "Chipotle", category: "Experiences", date_logged: "2026-05-14T12:00:00Z", notes: "" },
            
            // Week 2
            { transaction_id: "5", amount: 100.00, merchant: "HEB Groceries", category: "Groceries", date_logged: "2026-05-18T12:00:00Z", notes: "" },
            { transaction_id: "6", amount: 30.00, merchant: "Shell Gas", category: "Gas", date_logged: "2026-05-19T12:00:00Z", notes: "" },
            { transaction_id: "7", amount: 160.00, merchant: "Rave Concert", category: "Experiences", date_logged: "2026-05-20T12:00:00Z", notes: "#rave" },
        ];
        
        // Analyze over 2 weeks
        const analytics = calculateSpendingAnalytics(txs, DEFAULT_BUDGET_CONFIG, 2);
        
        assertEqual(analytics.totalWeeksAnalyzed, 2, "Analyzed weeks should be exactly 2");
        
        const groceriesAnalytic = analytics.categoryAnalytics.find(a => a.category === "Groceries");
        assert(!!groceriesAnalytic, "Groceries analytics should exist");
        assertEqual(groceriesAnalytic!.actualAverageSpend, 105.00, "Groceries average weekly spend should be $105.00");
        assertEqual(groceriesAnalytic!.difference, -20.00, "Groceries diff should be -$20.00 (under budget)");
        assertEqual(groceriesAnalytic!.differencePercent, -16.0, "Groceries under budget percentage should be -16.0%");
        assertEqual(groceriesAnalytic!.swipeFrequency, 1.0, "Groceries frequency should be 1.0 per week");
        assertEqual(groceriesAnalytic!.isOverBudget, false, "Groceries should be under budget");
        
        const experiencesAnalytic = analytics.categoryAnalytics.find(a => a.category === "Experiences");
        assert(!!experiencesAnalytic, "Experiences analytics should exist");
        assertEqual(experiencesAnalytic!.actualAverageSpend, 170.00, "Experiences average weekly spend should be $170.00");
        assertEqual(experiencesAnalytic!.difference, 40.00, "Experiences diff should be +$40.00 (over budget)");
        assertEqual(experiencesAnalytic!.differencePercent, 30.8, "Experiences over budget percentage should be +30.8%");
        assertEqual(experiencesAnalytic!.swipeFrequency, 1.0, "Experiences frequency should be 1.0 per week");
        assertEqual(experiencesAnalytic!.isOverBudget, true, "Experiences should be over budget");
        
        // Recommendations testing
        assert(analytics.recommendations.length > 0, "Should generate recommendations");
        
        // Validate that recommendation tags overspending and underspending
        const overspentRec = analytics.recommendations.find(r => r.includes("Experiences"));
        assert(!!overspentRec, "Should warn about Experiences overspending");
        
        const underspentRec = analytics.recommendations.find(r => r.includes("Groceries"));
        assert(!!underspentRec, "Should notify about Groceries savings");
        
        const tuningRec = analytics.recommendations.find(r => r.includes("Budget Tuning Idea"));
        assert(!!tuningRec, "Should suggest budget tuning to balance allocations");
    });
});

// Final report
console.log("\n=================================");
console.log(`📊 TEST RUN COMPLETED`);
console.log(`   Total Tests Run: ${testsRun}`);
console.log(`   Passed: ${testsRun - testsFailed}`);
console.log(`   Failed: ${testsFailed}`);
console.log("=================================\n");

if (testsFailed > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
