# Credit Card Payoff Forecast

## Starting Position

| Detail | Amount |
| :--- | ---: |
| Total credit card balance | $691.00 |
| Parents covering | -$200.00 |
| **Your out-of-pocket obligation** | **$491.00** |

Your weekly income is $850.00. The full $491 is 57.8% of a single paycheck -- large enough that dumping it all at once would gut your week, but small enough that spreading it over 2-3 weeks keeps everything intact.

---

## The Constraint: Protecting Essential Spending

These categories are non-negotiable. You need to eat, drive, and keep your subscriptions running:

| Category | Weekly | Status |
| :--- | ---: | :--- |
| Groceries | $125.00 | Protected |
| Gas | $40.00 | Protected |
| Subscriptions | $15.00 | Protected |
| **Essential floor** | **$180.00** | **Untouchable** |

That leaves **$670.00/week** across Experiences ($130), Simulated Housing ($190), and District Savings ($350) as the pool you can temporarily pull from.

---

## Three Payoff Strategies

### Strategy A -- Aggressive (1 Week)

Pay it all from a single paycheck by temporarily suspending savings.

| Category | Normal | This Week | Change |
| :--- | ---: | ---: | ---: |
| Groceries | $125.00 | $125.00 | -- |
| Gas | $40.00 | $40.00 | -- |
| Subscriptions | $15.00 | $15.00 | -- |
| Experiences | $130.00 | $130.00 | -- |
| Simulated Housing | $190.00 | $190.00 | -- |
| District Savings | $350.00 | $0.00 | -$350.00 |
| **Credit card payment** | -- | **$350.00** | -- |
| Remaining balance | | **$141.00** | |

> **Warning:** You still owe $141 after week 1. You would need to pull another ~$141 from savings in week 2 to finish it off. Total savings impact: missing ~$491 in savings contributions across those two weeks.

**Week-by-week timeline:**

```
Week 1:  Pay $350  |  Balance: $691 -> $341 ($200 parents) -> $141 you
Week 2:  Pay $141  |  Balance: $0    Savings that week: $209 instead of $350
Week 3+: Normal    |  Full $350/week to savings resumes
```

**Savings cost:** You lose $491 in savings over 2 weeks. At $350/week, you make that back in ~1.4 weeks of normal saving after payoff.

---

### Strategy B -- Moderate (3 Weeks) [Recommended]

Split the payment across 3 paychecks by pulling a little from savings and a little from experiences each week.

| Category | Normal | During Payoff | Weekly Change |
| :--- | ---: | ---: | ---: |
| Groceries | $125.00 | $125.00 | -- |
| Gas | $40.00 | $40.00 | -- |
| Subscriptions | $15.00 | $15.00 | -- |
| Experiences | $130.00 | $80.00 | -$50.00 |
| Simulated Housing | $190.00 | $190.00 | -- |
| District Savings | $350.00 | $237.00 | -$113.00 |
| **Credit card payment** | -- | **$163.00** | -- |

**Week-by-week timeline:**

```
Week 1:  Pay $163  |  Balance: $491 -> $328
Week 2:  Pay $163  |  Balance: $328 -> $165
Week 3:  Pay $165  |  Balance: $165 -> $0     (pay the remainder, savings normalizes)
Week 4+: Normal    |  Full allocations resume
```

**Savings cost:** You lose $339 in savings over 3 weeks ($113 x 3). You also reduce Experiences by $150 total ($50 x 3), meaning slightly fewer dining-out or spontaneous purchases during those 3 weeks.

**Why this is the recommended fit:**

1. You still save $237/week (67.7% of your normal savings rate)
2. You still have $80/week for experiences (enough for dining out and essentials)
3. It is fast enough to minimize interest (~$3-5 on $491 at a typical 25% APR)
4. Your rollover engine handles the recovery -- the $50/week you took from Experiences gets rebuilt through rollovers if you underspend in future weeks

---

### Strategy C -- Conservative (5 Weeks)

Minimal lifestyle disruption. Pull only from savings, leaving all spending categories untouched.

| Category | Normal | During Payoff | Weekly Change |
| :--- | ---: | ---: | ---: |
| Groceries | $125.00 | $125.00 | -- |
| Gas | $40.00 | $40.00 | -- |
| Subscriptions | $15.00 | $15.00 | -- |
| Experiences | $130.00 | $130.00 | -- |
| Simulated Housing | $190.00 | $190.00 | -- |
| District Savings | $350.00 | $250.00 | -$100.00 |
| **Credit card payment** | -- | **$100.00** | -- |

**Week-by-week timeline:**

```
Week 1:  Pay $100  |  Balance: $491 -> $391
Week 2:  Pay $100  |  Balance: $391 -> $291
Week 3:  Pay $100  |  Balance: $291 -> $191
Week 4:  Pay $100  |  Balance: $191 -> $91
Week 5:  Pay $91   |  Balance: $91  -> $0     (savings normalizes early this week)
Week 6+: Normal    |  Full allocations resume
```

**Savings cost:** You lose $491 across 5 weeks, but you never feel it week-to-week because spending stays exactly the same. The risk is that if your card carries interest, 5 weeks of accrual adds unnecessary cost.

---

## Comparison

| | Strategy A | Strategy B | Strategy C |
| :--- | :--- | :--- | :--- |
| **Payoff timeline** | 2 weeks | 3 weeks | 5 weeks |
| **Weekly payment** | $350 / $141 | $163 / $163 / $165 | $100 x 5 |
| **Savings hit per week** | $350 / $141 | $113 | $100 |
| **Experiences hit per week** | $0 | $50 | $0 |
| **Total savings lost** | $491 | $339 + $150 exp | $491 |
| **Lifestyle disruption** | None (but savings pause) | Mild | None |
| **Interest risk** | Lowest | Low | Highest |

---

## Keeping the Card Stable Going Forward

Once the balance is zeroed out, the goal is to never carry a balance again:

- **Your budget automation tracks every swipe in real time.** If you use the credit card for Groceries, Gas, and Experiences, the pipeline catches those transactions via Outlook alerts and deducts them from your weekly buckets.
- **Pay the statement balance in full every month.** Treat the credit card as a pass-through, not a lending tool. Every dollar you charge should already be accounted for in one of your six buckets.
- **Set a hard rule:** never charge more in a week than your total spending allocation ($500). If your bucket says you have $80 left in Experiences, that is your ceiling for the card that week.

---

## Open Questions

1. **When is your credit card statement due?** This determines how urgently you need to pay. If the due date is within 2 weeks, Strategy A or B is the safest. If it is 4+ weeks out, you have room for Strategy C.
2. **Is the card currently accruing interest?** If you are within a grace period (no interest yet), you have more flexibility on timing. If interest is already running, faster is better.
3. **What is the minimum payment?** Even while executing a strategy, you need to make at least the minimum by the due date to avoid a late fee and credit score hit.
4. **When does your first paycheck land?** Knowing the exact date lets us pin the week-by-week timeline to real calendar dates.
