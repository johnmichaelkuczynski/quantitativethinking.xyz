import { db } from "@workspace/db";
import {
  topicsTable,
  lecturesTable,
  assignmentsTable,
  problemsTable,
} from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

type SeedTopic = {
  slug: string;
  title: string;
  weekNumber: number;
  blurb: string;
  lectureTitle: string;
  body: string;
};

const TOPICS: SeedTopic[] = [
  // Week 1 — Foundations of quantitative reasoning
  {
    slug: "what-is-quantitative-reasoning",
    title: "What quantitative reasoning is and why it matters",
    weekNumber: 1,
    blurb: "Using numbers and quantities to reason carefully about the real world.",
    lectureTitle: "1.1 What quantitative reasoning is and why it matters",
    body: `# What quantitative reasoning is and why it matters

**Quantitative reasoning (QR)** is the disciplined use of numbers, quantities, and basic mathematics to *understand the world and evaluate claims*. It is critical thinking aimed at anything with a number in it — prices, risks, statistics, polls, charts, and forecasts.

## What it is not

- It is **not** advanced mathematics. The hard part is judgment, not algebra.
- It is **not** raw calculation. A correct number answering the wrong question is useless.
- It is **not** memorizing formulas. It is knowing *which* simple tool a situation calls for.

## The core moves

A quantitative reasoner habitually:

1. **Translates** between words and numbers — "most" into a rough percentage, a claim into a quantity.
2. **Attaches units** to every number, so it means something.
3. **Checks plausibility** — is this number even possible? Compared to what?
4. **Finds the baseline** — a number is only meaningful next to a reference point.

## Why it matters

We are flooded with numbers chosen to persuade: "40% more," "millions affected," "studies show." Quantitative reasoning is the skill that separates a number that *informs* from one that merely *impresses*. It protects you from being misled — by others and by your own innumeracy.

## Numeracy

QR is to numbers what literacy is to words. An innumerate person is as easily manipulated by a statistic as an illiterate person is by a forged document. The goal of this course is **fluent numeracy**: the reflex to ask, of any number, *how big, compared to what, and how do we know?*`,
  },
  {
    slug: "numbers-magnitude-number-line",
    title: "Numbers, magnitude, and the number line",
    weekNumber: 1,
    blurb: "Size, scale, and where a number sits relative to others.",
    lectureTitle: "1.2 Numbers, magnitude, and the number line",
    body: `# Numbers, magnitude, and the number line

Every number has a **magnitude** — its size or scale. Quantitative reasoning starts with a feel for how big numbers are and how they compare.

## The number line

Picture every number as a point on a line: negatives to the left, zero in the middle, positives to the right. Two facts the line makes obvious:

- **Order:** $-5 < -2 < 0 < 3 < 100$.
- **Distance:** the gap between numbers is itself a quantity (from $3$ to $100$ is $97$).

## Absolute vs. relative size

- **Absolute size:** the raw magnitude — a \\$10 difference.
- **Relative size:** size compared to a base — \\$10 off a \\$12 shirt (huge) vs. \\$10 off a \\$30,000 car (trivial).

Confusing the two is one of the most common quantitative errors.

## Big and small numbers

- A **thousand** is $10^3$, a **million** $10^6$, a **billion** $10^9$, a **trillion** $10^{12}$.
- Each step is **1,000 times** the last. A million seconds is about 12 days; a billion seconds is about 32 *years*.

## Scientific notation

For very large or very small numbers, write the magnitude as a power of ten: the speed of light is $3 \\times 10^8$ m/s; a virus is about $1 \\times 10^{-7}$ m wide. The exponent *is* the magnitude — read it first.`,
  },
  {
    slug: "estimation-order-of-magnitude",
    title: "Estimation and order-of-magnitude thinking",
    weekNumber: 1,
    blurb: "Fast ballpark answers, and reasoning in powers of ten.",
    lectureTitle: "1.3 Estimation and order-of-magnitude thinking",
    body: `# Estimation and order-of-magnitude thinking

A good **estimate** — a deliberate, rough approximation — is often more useful than a precise figure you cannot get. Estimation is the workhorse of quantitative reasoning.

## Order of magnitude

An **order of magnitude** is a factor of ten. Two quantities are "the same order of magnitude" if one is within about 10× of the other. Asking *which power of ten* is the right first question:

- Is a city's population in the thousands, the millions, or the billions?
- Is a fix going to cost hundreds or hundreds of thousands?

Getting the order of magnitude right matters far more than getting the last digit right.

## How to estimate

1. **Round aggressively** — keep one significant figure ($317 \\to 300$).
2. **Break the problem into pieces** you can each guess.
3. **Combine**, then ask whether the result is plausible.

> About how many heartbeats in a lifetime? Roughly $70$ beats/min $\\times 60 \\times 24 \\times 365 \\times 80 \\approx 3 \\times 10^9$ — a few billion.

## Precision vs. accuracy

**False precision** — "the project will cost \\$48,217" — signals confidence the data cannot support. A reasoner who says "about \\$50,000, give or take ten" is being *more* honest. Match the precision of your answer to the precision of your inputs.`,
  },
  {
    slug: "units-dimensions-sanity-checks",
    title: "Units, dimensions, and sanity checks",
    weekNumber: 1,
    blurb: "Numbers without units are meaningless; units catch errors.",
    lectureTitle: "1.4 Units, dimensions, and sanity checks",
    body: `# Units, dimensions, and sanity checks

A bare number is almost meaningless. "It's 30" — degrees? dollars? miles? The **unit** carries the meaning, and tracking units is one of the most powerful error-catching tools you have.

## Dimensional analysis

Treat units as algebra you can cancel and multiply. To convert, multiply by a fraction equal to **1**:

> $90 \\text{ km} \\times \\dfrac{1 \\text{ mi}}{1.6 \\text{ km}} \\approx 56 \\text{ mi}$

The km cancel, leaving miles. If the units don't come out right, the calculation is wrong.

## Compound units

Rates combine units: speed is **miles per hour** (mi/hr), a price is **dollars per kilogram** (\\$/kg), a flow is **liters per second**. The word "per" is a division sign. Reading the units tells you what to multiply or divide.

## Sanity checks

Before trusting a number, ask: *is this even possible?*

- A claim that a person drank "8 liters of water an hour" fails a sanity check.
- An answer of "the bridge is 4 cm long" means a unit slipped.

A famous \\$125-million spacecraft, the Mars Climate Orbiter, was lost because one team used pounds-force and another newtons. Units are not bookkeeping — they are correctness.`,
  },
  {
    slug: "ratios-rates-proportional-reasoning",
    title: "Ratios, rates, and proportional reasoning",
    weekNumber: 1,
    blurb: "Comparing quantities and scaling them up or down.",
    lectureTitle: "1.5 Ratios, rates, and proportional reasoning",
    body: `# Ratios, rates, and proportional reasoning

A **ratio** compares two quantities by division: 3 cups flour to 1 cup sugar is the ratio $3:1$. A **rate** is a ratio of *different* units — 60 miles per 1 hour.

## Unit rates

A **unit rate** expresses "per one": \\$2.50 per pound, 25 miles per gallon. Unit rates make comparisons fair — to compare a 12 oz can at \\$0.90 with an 18 oz can at \\$1.26, reduce both to price *per ounce* (\\$0.075 vs. \\$0.07).

## Proportions

A **proportion** is the statement that two ratios are equal:

> $\\dfrac{3 \\text{ flour}}{1 \\text{ sugar}} = \\dfrac{x}{4 \\text{ sugar}}$

Cross-multiply to solve: $x = 12$ cups of flour. This is **proportional reasoning** — scaling a relationship up or down while keeping the ratio fixed.

## Direct proportion

Two quantities are **directly proportional** when one is always a constant multiple of the other: $y = kx$. Double the recipe, double every ingredient.

## Per-capita reasoning

Comparing raw totals across groups of different sizes is misleading. Country A has more total emissions than Country B, but if A has ten times the population, its **per-capita** (per person) emissions may be far lower. Always ask whether a total should be turned into a rate.`,
  },
  {
    slug: "percentages-change-base-rates",
    title: "Percentages, percentage change, and base rates",
    weekNumber: 1,
    blurb: "Percent of what? Change relative to what? The base is everything.",
    lectureTitle: "1.6 Percentages, percentage change, and base rates",
    body: `# Percentages, percentage change, and base rates

A **percent** is just a fraction out of 100: $25\\% = \\frac{25}{100} = 0.25$. The crucial question is always *percent of what* — the **base**.

## Percentage change

$$\\text{percent change} = \\dfrac{\\text{new} - \\text{old}}{\\text{old}} \\times 100$$

A price rising from \\$40 to \\$50 is a $\\frac{10}{40} = 25\\%$ increase. Note the base is the *old* value.

## Increases and decreases are not symmetric

A 50% rise followed by a 50% fall does **not** return you to the start: \\$100 → \\$150 → \\$75. Going up then down by the same percent leaves you lower, because the base changed.

## Percentage points vs. percent

If support rises from 40% to 44%, that is **4 percentage points** but a **10 percent** relative increase ($\\frac{4}{40}$). Reports blur these on purpose — watch which is meant.

## Base rates

The **base rate** is how common something is to begin with. "Cases doubled!" is alarming only if you know the base: 1 case to 2 is not 50 to 100. Relative claims ("twice as likely") are empty without the **absolute** base rate behind them.`,
  },
  {
    slug: "reading-reconstructing-quantitative-claims",
    title: "Reading and reconstructing quantitative claims",
    weekNumber: 1,
    blurb: "Pulling the real quantity, unit, base, and source out of a claim.",
    lectureTitle: "1.7 Reading and reconstructing quantitative claims",
    body: `# Reading and reconstructing quantitative claims

A **quantitative claim** asserts something using a number. Most claims in the wild are stated loosely; **reconstructing** one means stating clearly what is actually being measured.

## The four questions

For any number you meet, ask:

1. **What is the quantity?** What exactly was counted or measured?
2. **What is the unit?** Dollars, percent, per capita, per year?
3. **What is the base or comparison?** Bigger, cheaper, faster — *than what?*
4. **What is the source?** Who produced this number, and how?

## The missing denominator

"10,000 people were harmed" sounds huge — but out of how many? Ten thousand out of ten thousand is a catastrophe; ten thousand out of a billion is rounding error. A numerator without its **denominator** is an unfinished claim.

## Watch the framing

The same fact can be dressed many ways: "90% fat-free" and "10% fat" are identical; "doubled the risk" and "rose from 1-in-a-million to 2-in-a-million" are identical. Reconstruct the claim in plain, neutral terms before you react to it.

## Standard form for a number

State it fully: *quantity, unit, base, time period, source.* "Unemployment is 4%" becomes "4% of the U.S. labor force was actively seeking work last month, per the Bureau of Labor Statistics." Now you can actually evaluate it.`,
  },

  // Week 2 — Quantitative inference and modeling
  {
    slug: "quantitative-arguments-vs-noise",
    title: "Quantitative arguments vs. quantitative noise",
    weekNumber: 2,
    blurb: "When a number is real evidence, and when it is just decoration.",
    lectureTitle: "2.1 Quantitative arguments vs. quantitative noise",
    body: `# Quantitative arguments vs. quantitative noise

A **quantitative argument** uses a number as genuine *evidence* for a conclusion. **Quantitative noise** is numbers that look like evidence but do no logical work.

## The test

Ask: **does this number actually bear on the conclusion?** If removing the number leaves the argument just as strong (or just as weak), the number was decoration.

## Forms of noise

- **Irrelevant precision:** "Our method is 37.6% more effective" — more effective at what, measured how?
- **Vague big numbers:** "Millions of people trust us" — millions out of how many, and trust meaning what?
- **Number as ornament:** a statistic dropped in to *sound* rigorous while supporting nothing.
- **Non-sequitur stats:** a true number that simply does not connect to the claim.

## A real quantitative argument

> "This intersection had 3 crashes per year before the new light and 0.4 per year after, over five years each — so the light reduced crashes."

The numbers are relevant, comparable, and measured over a meaningful span. That is signal.

## Why it matters

Numbers carry an aura of authority. The first job in evaluating any data-backed claim is to decide whether the data is *load-bearing* or merely **rhetorical**. Strip the number out and see if the argument survives.`,
  },
  {
    slug: "validity-error-numerical-inference",
    title: "Validity and error in numerical inference",
    weekNumber: 2,
    blurb: "Sound numerical reasoning, and why every number carries error.",
    lectureTitle: "2.2 Validity and error in numerical inference",
    body: `# Validity and error in numerical inference

A **numerical inference** draws a quantitative conclusion from quantitative premises. Like any reasoning, it can be valid or invalid — and the numbers themselves are never perfectly exact.

## Valid vs. invalid steps

A step is **invalid** when the conclusion does not follow:

- Averaging averages without weighting by group size.
- Adding percentages of different bases.
- Concluding a trend from two data points.

## Accuracy vs. precision

- **Accuracy:** how close a measurement is to the true value.
- **Precision:** how finely it is reported / how repeatable it is.

A scale that always reads 2 kg high is *precise but inaccurate*. The two are independent.

## Error propagates

Every measurement has error, and error **flows through** a calculation. If a room is "about 4 m by 5 m, give or take 0.2 m," its area is *not* a clean $20\\text{ m}^2$ — the uncertainty grows. A result can never be more precise than the least precise input.

## Significant figures

Significant figures track how much you actually know. Multiplying $4.2$ (two figures) by $3.17$ should give $13$, not $13.314$ — the extra digits are fiction. **False precision** is claiming certainty your data cannot back. Round your conclusion to honesty.`,
  },
  {
    slug: "linear-vs-nonlinear-thinking",
    title: "Linear vs. nonlinear thinking",
    weekNumber: 2,
    blurb: "Constant-rate intuition, and the many places it breaks down.",
    lectureTitle: "2.3 Linear vs. nonlinear thinking",
    body: `# Linear vs. nonlinear thinking

A relationship is **linear** when one quantity changes at a *constant rate* with another: $y = mx + b$, a straight line. Add one more, get the same fixed amount more. Human intuition defaults to linear — and the world often is not.

## Linear relationships

- Buying apples at \\$2 each: total cost is linear in count.
- Driving at a steady speed: distance is linear in time.

The slope $m$ is the constant rate of change; the line never bends.

## Nonlinear relationships

In **nonlinear** relationships the rate of change itself changes:

- **Area and volume:** double a square's side and area grows $4\\times$; double a cube's side and volume grows $8\\times$ (the square–cube law).
- **Compounding:** money or populations grow by a percentage, so the increase gets bigger each step.
- **Diminishing returns:** the tenth hour of study adds far less than the first.

## Why it misleads

Linear intuition badly underestimates nonlinear processes. "If 1 machine makes 100 parts/hour, 10 machines make 1,000" may be linear — but "if a pond's lily pads double daily and cover it in 30 days, when are they half-covered?" trips everyone (day 29, not day 15). **Ask whether the rate is constant before you extrapolate.**`,
  },
  {
    slug: "exponential-growth-decay",
    title: "Exponential growth and decay",
    weekNumber: 2,
    blurb: "Growth by a constant percentage: doubling, half-life, and surprise.",
    lectureTitle: "2.4 Exponential growth and decay",
    body: `# Exponential growth and decay

**Exponential** change multiplies by a constant factor each period — growth or decay by a fixed *percentage*, not a fixed amount.

$$y = a\\,(1 + r)^t$$

where $a$ is the start, $r$ the rate per period, $t$ the number of periods.

## Doubling time and the Rule of 70

A quantity growing at $r\\%$ per period doubles in about $\\frac{70}{r}$ periods. At 7% annual growth, money doubles in roughly 10 years; at 10%, in about 7.

## Why exponentials shock us

Exponential growth looks slow, then erupts. Grains of rice doubled on each of a chessboard's 64 squares total over $10^{19}$ grains — more than all the rice ever grown. Our linear intuition is hopeless here; that is exactly why compound interest, viral spread, and population growth surprise people.

## Exponential decay

The mirror image: a quantity falls by a constant percentage each period, $y = a(1-r)^t$. Its **half-life** is the time to halve. Radioactive material, drug concentration in the blood, and a depreciating car all decay exponentially — fast at first, then a long tail.

## The lesson

Whenever change is *by a percentage of the current amount*, reach for exponentials, not lines — and expect the future to arrive faster than it feels.`,
  },
  {
    slug: "counting-combinatorics-possibility-spaces",
    title: "Counting, combinatorics, and possibility spaces",
    weekNumber: 2,
    blurb: "How fast possibilities multiply, and why we underestimate it.",
    lectureTitle: "2.5 Counting, combinatorics, and possibility spaces",
    body: `# Counting, combinatorics, and possibility spaces

Many quantitative questions reduce to **counting**: how many ways, how many possibilities? The size of the **possibility space** drives probability, security, and risk.

## The multiplication principle

If one choice has $m$ options and an independent next choice has $n$, together they have $m \\times n$ outcomes. A 4-digit PIN has $10 \\times 10 \\times 10 \\times 10 = 10{,}000$ possibilities.

## Permutations vs. combinations

- **Permutation** — order matters. Arrangements of 3 of 5 books: $5 \\times 4 \\times 3 = 60$.
- **Combination** — order does not matter. Choosing 3 of 5 books: $\\frac{60}{3!} = 10$.

The factorial $n! = n\\times(n-1)\\times\\cdots\\times 1$ counts full orderings.

## Combinatorial explosion

Possibilities multiply with terrifying speed. Just 10 binary on/off switches give $2^{10} = 1{,}024$ states; 20 give over a million. This is why brute-forcing a long password is hopeless — and why our gut badly *under*estimates how many configurations exist.

## Why it matters for reasoning

Probability is often "favorable outcomes ÷ total outcomes," so you cannot reason about chance without counting. And recognizing a huge possibility space explains coincidences: with millions of people buying lottery tickets, *someone* winning is near-certain even though *you* winning is not.`,
  },
  {
    slug: "modeling-with-functions",
    title: "Modeling with functions",
    weekNumber: 2,
    blurb: "Turning a real situation into a function — and knowing its limits.",
    lectureTitle: "2.6 Modeling with functions",
    body: `# Modeling with functions

A **model** is a simplified description that maps inputs to outputs. A **function** — a rule giving one output per input — is the basic building block of quantitative models.

## Common model shapes

- **Linear** $y = mx + b$: constant rate (a flat fee plus a per-unit charge).
- **Quadratic** $y = ax^2$: area-like growth, or a thrown object's height.
- **Exponential** $y = a(1+r)^t$: percentage growth or decay.

Choosing the right *shape* is the heart of modeling: does the quantity grow by a fixed amount, or a fixed percentage, or with the square of something?

## Every model has assumptions

A model includes some factors and ignores others. "Cost = \\$5 × items" assumes no bulk discount, no shipping, no tax. Knowing what a model *leaves out* tells you when to trust it.

## "All models are wrong, some are useful"

A model is a map, not the territory. The test is not whether it is perfectly true — none is — but whether it is *useful* for the question at hand.

## Interpolation vs. extrapolation

Using a model *within* the data range (**interpolation**) is fairly safe. Pushing it far *beyond* the data (**extrapolation**) is dangerous: a child growing 6 cm/year does not reach 12 m tall by age 200. Models break outside the conditions they were built for.`,
  },
  {
    slug: "fermi-estimation",
    title: "Estimating the unknown (Fermi problems)",
    weekNumber: 2,
    blurb: "Decompose an impossible question into estimable pieces.",
    lectureTitle: "2.7 Estimating the unknown (Fermi problems)",
    body: `# Estimating the unknown (Fermi problems)

A **Fermi problem** asks you to estimate a quantity that seems impossible to know, using only common-sense facts and arithmetic. Named for physicist Enrico Fermi, who could ballpark almost anything.

## The method

1. **Decompose** the unknown into a chain of pieces you *can* guess.
2. **Estimate** each piece to one significant figure.
3. **Multiply** them together.
4. **Sanity-check** the order of magnitude.

## The classic example

*How many piano tuners are in Chicago?*

- ~3,000,000 people, ~2 per household → ~1,500,000 households.
- Maybe 1 in 20 owns a piano → ~75,000 pianos.
- Tuned once a year; a tuner does ~4/day × ~250 days ≈ 1,000/year.
- So about $75{,}000 / 1{,}000 \\approx 75$ tuners.

The true figure is in that ballpark — remarkable for a problem with no data.

## Why errors cancel

Each guess is too high or too low, roughly at random, so over-and under-estimates **partly cancel** when multiplied. A Fermi estimate rarely nails the number, but it reliably lands the *order of magnitude* — which is usually what you need to make a decision.`,
  },

  // Week 3 — Statistics, probability, and data
  {
    slug: "descriptive-statistics-what-they-hide",
    title: "Descriptive statistics and what they hide",
    weekNumber: 3,
    blurb: "Summaries compress data — and quietly discard information.",
    lectureTitle: "3.1 Descriptive statistics and what they hide",
    body: `# Descriptive statistics and what they hide

**Descriptive statistics** summarize a pile of data with a few numbers — a mean, a median, a percentage. They are indispensable, but every summary *throws information away*.

## Measures of center

- **Mean:** the arithmetic average — sum divided by count.
- **Median:** the middle value when sorted.
- **Mode:** the most frequent value.

These collapse a whole dataset into one number; by design they cannot show the spread, the shape, or the exceptions.

## Counts vs. rates

A raw **count** ("500 accidents") and a **rate** ("500 per million trips") tell different stories. A summary that reports one while you need the other can completely reverse the conclusion.

## What a single number hides

Two classes can have the *same* average score while one is uniformly mediocre and the other is half brilliant, half failing. The mean hides that completely. Famous data sets exist with identical means, medians, and correlations but wildly different shapes — visible only when you actually plot them.

## The habit

Whenever you are handed a summary statistic, ask **what it conceals**: the distribution, the outliers, the sample size, the denominator. The number that was *not* reported is often the one that matters.`,
  },
  {
    slug: "distributions-averages-outliers",
    title: "Distributions, averages, and outliers",
    weekNumber: 3,
    blurb: "The shape of the data, and which average to trust.",
    lectureTitle: "3.2 Distributions, averages, and outliers",
    body: `# Distributions, averages, and outliers

A **distribution** describes how the values in a dataset are spread out — how often each value (or range) occurs. The shape of the distribution decides which summary is honest.

## Shape

- **Symmetric:** values balanced around the center (a bell curve).
- **Skewed:** a long tail on one side (incomes, house prices — a few very large values stretch the right tail).
- **Bimodal:** two distinct peaks (often two groups mixed together).

## Mean vs. median under skew

The **mean** is pulled toward the long tail; the **median** resists it. In a town where most earn \\$40k but one resident earns \\$50 million, the *mean* income is in the millions while the *median* stays near \\$40k. For skewed data, the **median** is usually the fairer "typical" value.

## Outliers

An **outlier** is a value far from the rest. It may be a data-entry error, or the single most important point in the set (a fraud, a breakthrough, a failure). Never silently delete outliers — investigate them. They distort the mean and can dominate a conclusion.

## The takeaway

Before quoting an "average," picture the distribution. *Which* average, and whether it is being dragged by skew or outliers, often matters more than the value itself.`,
  },
  {
    slug: "variation-spread-danger-of-mean",
    title: "Variation, spread, and the danger of the mean",
    weekNumber: 3,
    blurb: "Why the average alone can be dangerously misleading.",
    lectureTitle: "3.3 Variation, spread, and the danger of the mean",
    body: `# Variation, spread, and the danger of the mean

Two datasets can share an identical mean yet behave completely differently. The missing piece is **spread** — how much the values vary.

## Measures of spread

- **Range:** largest minus smallest value (simple, but sensitive to outliers).
- **Variance:** the average squared distance from the mean.
- **Standard deviation:** the square root of the variance — spread in the original units.

A small standard deviation means values cluster near the mean; a large one means they scatter widely.

## The flaw of averages

Planning on the average alone can be disastrous. A statistician reportedly drowned crossing a river "4 feet deep on average" — it was 1 foot at the banks and 10 feet in the middle. The mean was true and useless.

## Why spread matters for decisions

- An investment averaging 8% with low variability is very different from one averaging 8% that swings between +40% and −30%.
- A delivery that "averages 3 days" but ranges from 1 to 20 is unreliable even with a fine average.

## The habit

Never accept a mean without asking about the **variation** around it. The average tells you the center; the spread tells you the risk. A number without its spread is half a story.`,
  },
  {
    slug: "probability-quantifying-uncertainty",
    title: "Probability and quantifying uncertainty",
    weekNumber: 3,
    blurb: "Putting numbers on chance, and the rules they obey.",
    lectureTitle: "3.4 Probability and quantifying uncertainty",
    body: `# Probability and quantifying uncertainty

**Probability** measures how likely an event is, as a number from 0 (impossible) to 1 (certain). It is how we quantify uncertainty.

## Basic rules

- A probability is always in $[0, 1]$.
- **Complement:** $P(\\text{not } A) = 1 - P(A)$.
- **Independent events** (one doesn't affect the other): $P(A \\text{ and } B) = P(A)\\cdot P(B)$.
- **Mutually exclusive events** (can't both happen): $P(A \\text{ or } B) = P(A) + P(B)$.

## Probability as long-run frequency

A fair coin has $P(\\text{heads}) = 0.5$ — meaning that over many flips, about half land heads. It does **not** promise exactly 5 heads in 10 flips.

## The gambler's fallacy

After five heads in a row, the next flip is still $0.5$. The coin has no memory; "it's due for tails" is the **gambler's fallacy**. Independent events do not balance themselves out in the short run.

## Combining small probabilities

Independent risks multiply. If each part of a system fails with probability $0.1$, two such parts both holding is $0.9 \\times 0.9 = 0.81$. Reasoning about compound chance is just careful multiplication — and it routinely defeats intuition.`,
  },
  {
    slug: "conditional-probability-base-rate-neglect",
    title: "Conditional probability and base-rate neglect",
    weekNumber: 3,
    blurb: "Probability given evidence, and the famous test-result trap.",
    lectureTitle: "3.5 Conditional probability and base-rate neglect",
    body: `# Conditional probability and base-rate neglect

**Conditional probability**, written $P(A \\mid B)$, is the probability of $A$ *given that* $B$ has occurred. Updating probabilities on new evidence is one of the most error-prone moves in reasoning.

## The confusion of the inverse

$P(A \\mid B)$ is **not** the same as $P(B \\mid A)$. The probability of a rash *given* measles is high; the probability of measles *given* a rash is low, because most rashes aren't measles. Swapping these two is a classic blunder.

## Base-rate neglect

When we judge a conditional probability, we tend to ignore the **base rate** — how common the condition is to begin with.

> A disease affects **1 in 1,000** people. A test is **99% accurate**. You test positive. Your chance of having the disease is *not* 99%.

Out of 100,000 people: ~100 are sick (≈99 test positive), but ~1% of the 99,900 healthy — about **999** — also test positive. So among ~1,098 positives, only ~99 are truly sick: roughly **9%**, not 99%.

## The false-positive paradox

When a condition is rare, even an accurate test produces *mostly false positives*, because the huge healthy group swamps the tiny sick one. The base rate is decisive — and the instinct to ignore it is exactly what makes medical, legal, and security statistics so widely misread.`,
  },
  {
    slug: "correlation-causation-confounding",
    title: "Correlation, causation, and confounding",
    weekNumber: 3,
    blurb: "Why things moving together need not be cause and effect.",
    lectureTitle: "3.6 Correlation, causation, and confounding",
    body: `# Correlation, causation, and confounding

Two quantities are **correlated** when they tend to move together. The cardinal rule of quantitative reasoning: **correlation does not imply causation.**

## What correlation measures

A correlation coefficient runs from $-1$ to $+1$: near $+1$ they rise together, near $-1$ one rises as the other falls, near $0$ no linear relationship. It measures *association*, nothing more.

## Why correlation ≠ causation

If A and B are correlated, several stories are possible:

- A causes B.
- B causes A (**reverse causation**).
- A third factor C causes both (a **confounder**).
- It is coincidence (**spurious correlation**).

Ice-cream sales correlate with drownings — not because ice cream drowns people, but because *summer heat* (the confounder) drives both.

## Spurious correlations

With enough variables, some will line up by pure chance. The number of films an actor appears in and yearly cheese consumption can correlate over a decade and mean absolutely nothing.

## Establishing causation

To show causation you need to rule out confounders — ideally a **randomized controlled trial**, where you change one factor, hold the rest fixed, and compare. Until then, "linked to" is *not* "causes."`,
  },
  {
    slug: "sampling-bias-law-of-small-numbers",
    title: "Sampling, bias, and the law of small numbers",
    weekNumber: 3,
    blurb: "When a sample misrepresents the whole, and small samples mislead.",
    lectureTitle: "3.7 Sampling, bias, and the law of small numbers",
    body: `# Sampling, bias, and the law of small numbers

We almost never measure a whole **population**, so we study a **sample** and generalize. The sample is trustworthy only if it truly represents the whole.

## Random sampling

A **random sample** gives every member an equal chance of selection, which guards against hidden skew. Without randomness, the sample can systematically miss part of the population.

## Kinds of bias

- **Selection bias:** the sampling method favors some group (a phone poll at noon misses workers).
- **Response/non-response bias:** the people who answer differ from those who don't (angry customers review more).
- **Survivorship bias:** you see only the survivors — studying only successful companies hides the failures that did the same things.

## Margin of error

A poll result of "52% ± 3%" means the true value is plausibly 49–55%. A reported number without its margin of error pretends to a precision it does not have.

## The law of small numbers

Small samples are **volatile**: flip a coin 4 times and all-heads is common; flip 1,000 times and it never happens. People wrongly expect tiny samples to mirror the population, which fuels false patterns — "this small school tops the rankings" usually reflects small-sample luck, soon erased by **regression to the mean**.`,
  },

  // Week 4 — Applied quantitative reasoning and capstone
  {
    slug: "misleading-graphs-visualization",
    title: "Misleading graphs and data visualization",
    weekNumber: 4,
    blurb: "How charts distort the truth, and how to read them critically.",
    lectureTitle: "4.1 Misleading graphs and data visualization",
    body: `# Misleading graphs and data visualization

A graph should make data *clearer*. A misleading graph makes a weak claim *look* strong by exploiting how our eyes read pictures.

## Common tricks

- **Truncated axis:** a y-axis starting at 90 instead of 0 turns a tiny change into a cliff.
- **Inverted or dual axes:** two y-axes scaled to manufacture a "relationship."
- **Cherry-picked range:** zooming to the window that shows the desired trend.
- **3-D and perspective:** depth that distorts which bar looks bigger.
- **Area for length:** doubling an icon's height *and* width quadruples its area, exaggerating a 2× change.

## Read the chart, not the picture

1. **Check the axes** — where do they start, what are the units, is the scale linear?
2. **Check the range** — what time span or subset is shown, and what is left off?
3. **Find the baseline** — change relative to what?
4. **Compare to the numbers** — does the visual impression match the actual figures?

## The lesson

A picture can lie while every number on it is technically true. Treat a graph as a *claim* to be reconstructed — axes, scale, and range first — before you let its shape persuade you.`,
  },
  {
    slug: "statistical-fallacies-number-abuse",
    title: "Statistical fallacies and number abuse",
    weekNumber: 4,
    blurb: "The recurring tricks people use to abuse statistics.",
    lectureTitle: "4.2 Statistical fallacies and number abuse",
    body: `# Statistical fallacies and number abuse

Statistics can be abused in a handful of recurring ways. Learn the patterns and you'll spot them everywhere.

## The usual suspects

- **Cherry-picking:** reporting only the data that fits, ignoring the rest.
- **Misleading average:** quoting the mean of skewed data to inflate a "typical" value.
- **Base-rate fallacy:** ignoring how common something is when reading a probability.
- **False precision:** "63.4% of users" from a survey of 30 people.
- **Percentage abuse:** mixing up percent and percentage points, or hiding the base.

## Simpson's paradox

A trend can appear in every subgroup yet **reverse** when the groups are combined (or vice versa), depending on group sizes. A treatment can look better for men *and* for women separately, but worse overall — because the groups had very different baseline rates. Always ask whether pooling or splitting the data changes the story.

## p-hacking

Test enough hypotheses and some will look "significant" by chance alone. Running 20 comparisons and reporting only the one that "worked" manufactures a result out of noise.

## The defense

For any statistic, ask the standard questions: *Compared to what? Out of how many? Selected how? What was left out?* Most number abuse collapses the moment you demand the denominator and the full data.`,
  },
  {
    slug: "risk-expected-value-decisions",
    title: "Risk, expected value, and decision-making",
    weekNumber: 4,
    blurb: "Weighing outcomes by their probability to choose well.",
    lectureTitle: "4.3 Risk, expected value, and decision-making",
    body: `# Risk, expected value, and decision-making

Quantitative reasoning is not only about what is true, but about what to *do* under uncertainty. The key tool is **expected value**.

## Expected value

The **expected value** (EV) of a choice is each outcome's value weighted by its probability, then summed:

$$\\text{EV} = \\sum (\\text{value} \\times \\text{probability})$$

> A \\$1 ticket pays \\$1,000,000 with probability $\\frac{1}{10{,}000{,}000}$. Its EV is $\\frac{1{,}000{,}000}{10{,}000{,}000} = \\$0.10$ — far below the \\$1 price.

Lotteries and most gambles have negative expected value; insurance has negative EV for you *on average* but buys protection against ruin.

## Relative vs. absolute risk

"This drug doubles your risk" is meaningless without the base: from 1-in-a-million to 2-in-a-million is a doubling no one should fear. Always convert **relative risk** back to **absolute** numbers.

## Beyond the average

EV assumes you can repeat the bet many times. For one-shot, high-stakes decisions, **risk tolerance** matters: a guaranteed \\$50 can rightly beat a coin-flip for \\$110 if losing would be catastrophic.

## Judge the decision, not the outcome

A good decision is one with the best EV *given what you knew* — even if luck made it turn out badly. Don't confuse a bad result with a bad choice.`,
  },
  {
    slug: "evaluating-studies-polls-claims",
    title: "Evaluating studies, polls, and claims",
    weekNumber: 4,
    blurb: "The questions that separate solid evidence from spin.",
    lectureTitle: "4.4 Evaluating studies, polls, and claims",
    body: `# Evaluating studies, polls, and claims

Headlines distill studies into a sentence and lose everything that matters. Evaluating the quantitative claim behind the headline is a core applied skill.

## Questions for any study

- **Sample size:** how many subjects? Tiny studies are unreliable.
- **Sampling method:** random and representative, or self-selected?
- **Control group:** was there a comparison, or just before/after?
- **Effect size:** is the difference large, or merely "statistically significant"?
- **Funding and conflicts:** who paid, and do they gain from the result?

## Observational vs. experimental

An **experiment** (especially a randomized controlled trial) can support causation. An **observational study** can only find correlation — so "people who do X live longer" may be confounded by everything else those people do.

## Polls

For a poll, check the **margin of error**, the **sample size**, *who* was asked, and *how the question was worded*. "Do you support common-sense reform?" and "Do you support this costly mandate?" poll the same policy very differently.

## Statistical vs. practical significance

A result can be statistically significant yet trivial in size — a real but 0.1% effect. Ask not only "is it real?" but "is it **big enough to matter**?" The story and the statistic are rarely the same; reconstruct the claim before believing it.`,
  },
  {
    slug: "financial-economic-reasoning",
    title: "Financial and economic quantitative reasoning",
    weekNumber: 4,
    blurb: "Interest, inflation, and the money math that trips people up.",
    lectureTitle: "4.5 Financial and economic quantitative reasoning",
    body: `# Financial and economic quantitative reasoning

Money is where quantitative reasoning pays off most directly. A few ideas explain most personal-finance mistakes.

## Compound interest

Interest earns interest, so balances grow **exponentially**: $A = P(1+r)^t$. By the Rule of 70, money at 7% doubles in about a decade. The same math runs in reverse on debt — credit-card balances compound *against* you.

## APR vs. APY

The **APR** is the stated annual rate; the **APY** folds in compounding within the year. A "1% monthly" card is not 12% but about $(1.01)^{12}-1 \\approx 12.7\\%$ APY. Compare loans by the compounded figure.

## Real vs. nominal

A **nominal** amount ignores inflation; a **real** amount adjusts for it. A 3% raise during 4% inflation is a real *pay cut*. "Highest ever" dollar figures (box-office records, salaries) are usually meaningless until adjusted for inflation.

## Opportunity cost and present value

Every dollar spent or tied up has an **opportunity cost** — the return it could have earned elsewhere. And money later is worth less than money now (**present value**), because today's dollar can be invested. Sound financial reasoning compares options on the same time-adjusted footing.

## The habit

When a financial claim appears, restate it in **compounded, inflation-adjusted, per-period** terms. Most "too good to be true" offers fail that translation instantly.`,
  },
  {
    slug: "detecting-quantitative-misinformation",
    title: "Detecting quantitative misinformation",
    weekNumber: 4,
    blurb: "Red flags that a number is fabricated, abused, or out of context.",
    lectureTitle: "4.6 Detecting quantitative misinformation",
    body: `# Detecting quantitative misinformation

Numbers lend instant credibility, which makes them a favorite tool of misinformation. Detecting abused statistics is now a survival skill.

## Red flags

- **No source:** a precise statistic with no traceable origin ("studies show 73%...").
- **No denominator:** a scary numerator with no "out of how many."
- **Suspicious precision:** "exactly 47.3% of people" when no one could measure that.
- **Impossible or round-trip numbers:** figures that fail a basic sanity check, or percentages that exceed 100.
- **Big number, no context:** a giant total with no per-capita or per-year framing.
- **Mismatched comparison:** relative risk with the absolute base hidden.

## Verification techniques

1. **Trace the number** back to its original source, not the post quoting it.
2. **Check the denominator** and the base rate.
3. **Run a sanity check** — estimate it yourself and see if the orders of magnitude agree.
4. **Read laterally** — see what independent sources report.

## Consider the incentive

Ask who benefits if you believe and share the number. And apply the *same* scrutiny to statistics that flatter your own side — that is exactly where your guard drops and a fabricated figure slips through.`,
  },
  {
    slug: "quantitative-reasoning-across-domains",
    title: "Applying quantitative reasoning across domains",
    weekNumber: 4,
    blurb: "How the same QR habits transfer to health, news, money, and policy.",
    lectureTitle: "4.7 Applying quantitative reasoning across domains",
    body: `# Applying quantitative reasoning across domains

Quantitative reasoning is a **general** skill, but it shows up differently in each field. The power comes from carrying the same habits everywhere.

## Domain by domain

- **Health:** convert relative risk to absolute; separate correlation from causation in studies; watch tiny samples.
- **News:** check the denominator, the base rate, and the chart's axes before reacting to a statistic.
- **Personal finance:** think in compounded, inflation-adjusted terms; weigh opportunity cost; ignore "highest ever" without adjustment.
- **Policy:** ask about per-capita figures, confounders, and what a model leaves out.
- **Everyday life:** estimate, sanity-check, and compare unit rates at the store.

## The transfer problem

The hard part is **transfer** — using a skill learned in one context in a brand-new one. It does not happen automatically. You build it by deliberately asking the same core questions in every domain.

## The four reflexes

Whatever the field, drill these until they are automatic:

1. **How big** is this — what order of magnitude?
2. **Compared to what** — what is the base or baseline?
3. **How do we know** — what is the source and method?
4. **Does it pass a sanity check** — is this number even possible?

Make those four a reflex and you reason quantitatively anywhere.`,
  },
  {
    slug: "capstone-synthesis",
    title: "Capstone synthesis",
    weekNumber: 4,
    blurb: "Putting the whole quantitative toolkit to work on a real claim.",
    lectureTitle: "4.8 Capstone synthesis",
    body: `# Capstone synthesis

The capstone ties the course together: take a real quantitative claim from the wild and evaluate it end to end.

## The claim

> "A new study shows students who use our app score **20% higher**. Over **1 million** students can't be wrong — don't let your child fall behind."

## Apply the toolkit

1. **Reconstruct the claim** — 20% higher *than whom*, on *what test*, over *what period*? (Topic 1.7)
2. **Pin the base and units** — 20% of what score? Percentage points or relative percent? (Topic 1.6)
3. **Sanity-check the magnitudes** — is a 20% jump even plausible; what does "1 million users" prove about *effectiveness*? (Topics 1.3, 2.1)
4. **Interrogate the study** — sample size, control group, who funded it, observational or experimental? (Topics 3.7, 4.4)
5. **Separate correlation from causation** — maybe motivated families both buy the app *and* study more (a confounder). (Topic 3.6)
6. **Spot the number abuse and framing** — "1 million can't be wrong" is irrelevant; "fall behind" is fear, not data. (Topics 4.2, 4.6)
7. **Weigh the decision** — expected value and cost vs. the real, absolute effect. (Topic 4.3)

## The standard

A quantitative claim is worth believing when the **numbers are real, the comparison is fair, the method is sound, and the magnitude actually matters**. That single test — applied honestly to claims you like and dislike alike — is quantitative reasoning.`,
  },
];

type SeedAssignment = {
  kind: "homework" | "test" | "midterm" | "final";
  title: string;
  weekNumber: number;
  isTimed: boolean;
  timeLimitMinutes: number | null;
  instructions: string;
  problems: Array<{
    topicSlug: string;
    prompt: string;
    correctAnswer: string;
    explanation: string;
    hint?: string;
  }>;
};

const ASSIGNMENTS: SeedAssignment[] = [
  // Week 1
  {
    kind: "homework",
    title: "Homework 1.1 — Numbers, magnitude, and estimation",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice. Explain your reasoning in the answer box.",
    problems: [
      { topicSlug: "what-is-quantitative-reasoning", prompt: "True or false: quantitative reasoning is mainly about doing advanced mathematics.", correctAnswer: "false", explanation: "QR is the careful use of basic math and judgment to evaluate real claims — not advanced math." },
      { topicSlug: "numbers-magnitude-number-line", prompt: "A billion is how many times larger than a million? (A number.)", correctAnswer: "1000", explanation: "A billion is 10^9 and a million is 10^6, so it is 10^3 = 1,000 times larger." },
      { topicSlug: "estimation-order-of-magnitude", prompt: "Two quantities are the 'same order of magnitude' if one is within about what factor of the other? (A number.)", correctAnswer: "10", explanation: "An order of magnitude is a factor of ten." },
    ],
  },
  {
    kind: "homework",
    title: "Homework 1.2 — Units, ratios, and percentages",
    weekNumber: 1,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "units-dimensions-sanity-checks", prompt: "To convert a quantity from one unit to another, you multiply it by a fraction equal to what number?", correctAnswer: "1", explanation: "Conversion factors equal 1, so multiplying by them changes units without changing the value." },
      { topicSlug: "ratios-rates-proportional-reasoning", prompt: "A rate that expresses a quantity 'per one' unit (like miles per gallon) is called a ____ rate.", correctAnswer: "unit", explanation: "A unit rate is expressed per single unit and makes comparisons fair." },
      { topicSlug: "percentages-change-base-rates", prompt: "If a price rises from $40 to $50, what is the percentage increase? (Include the % sign or the number.)", correctAnswer: "25", explanation: "(50 − 40)/40 × 100 = 25%. The base is the old value, 40." },
      { topicSlug: "percentages-change-base-rates", prompt: "Support rises from 40% to 44%. That is a rise of how many percentage points? (A number.)", correctAnswer: "4", explanation: "44 − 40 = 4 percentage points (though a 10% relative increase)." },
    ],
  },
  {
    kind: "test",
    title: "Week 1 Test",
    weekNumber: 1,
    isTimed: true,
    timeLimitMinutes: 30,
    instructions: "Timed. 30 minutes. Pasting is disabled.",
    problems: [
      { topicSlug: "numbers-magnitude-number-line", prompt: "$10 off a $12 shirt vs. $10 off a $30,000 car — is the $10 the same in absolute or in relative size?", correctAnswer: "absolute", explanation: "The absolute difference is identical ($10); the relative size differs enormously." },
      { topicSlug: "estimation-order-of-magnitude", prompt: "Reporting a project cost as 'exactly $48,217' when the data is rough is an example of false ____.", correctAnswer: "precision", explanation: "False precision claims more exactness than the inputs support." },
      { topicSlug: "units-dimensions-sanity-checks", prompt: "An answer that says a bridge is '4 cm long' should be rejected by what kind of check?", correctAnswer: "sanity check", explanation: "A sanity check asks whether the number is even possible." },
      { topicSlug: "ratios-rates-proportional-reasoning", prompt: "Comparing countries' total emissions is misleading; you should instead compare ____ emissions (two words, 'per ___').", correctAnswer: "per capita", explanation: "Per-capita rates account for differing population sizes." },
      { topicSlug: "percentages-change-base-rates", prompt: "A 50% increase followed by a 50% decrease leaves you above, below, or at the original value?", correctAnswer: "below", explanation: "$100 → $150 → $75: the base changes, so it is not symmetric." },
      { topicSlug: "reading-reconstructing-quantitative-claims", prompt: "'10,000 people were harmed' is incomplete without which missing quantity?", correctAnswer: "denominator", explanation: "A numerator needs its denominator (out of how many) to be meaningful." },
    ],
  },

  // Week 2
  {
    kind: "homework",
    title: "Homework 2.1 — Arguments, inference, and growth",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "quantitative-arguments-vs-noise", prompt: "If removing a number from an argument leaves it just as strong, that number was evidence or noise?", correctAnswer: "noise", explanation: "A load-bearing number changes the argument; decoration does not." },
      { topicSlug: "validity-error-numerical-inference", prompt: "A scale that always reads 2 kg too high is precise but not ____.", correctAnswer: "accurate", explanation: "Accuracy is closeness to the true value; precision is repeatability." },
      { topicSlug: "exponential-growth-decay", prompt: "By the Rule of 70, money growing at 7% per year doubles in about how many years? (A number.)", correctAnswer: "10", explanation: "70 ÷ 7 = 10 years to double." },
    ],
  },
  {
    kind: "homework",
    title: "Homework 2.2 — Modeling, counting, and estimation",
    weekNumber: 2,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "linear-vs-nonlinear-thinking", prompt: "If lily pads double daily and cover a pond on day 30, on what day is it half covered? (A number.)", correctAnswer: "29", explanation: "Doubling means it was half-covered the day before — day 29 (nonlinear thinking)." },
      { topicSlug: "counting-combinatorics-possibility-spaces", prompt: "How many possible 4-digit PINs are there using digits 0–9? (A number.)", correctAnswer: "10000", explanation: "10 × 10 × 10 × 10 = 10,000 by the multiplication principle." },
      { topicSlug: "modeling-with-functions", prompt: "Pushing a model far beyond the range of its data is called ____.", correctAnswer: "extrapolation", explanation: "Extrapolation beyond the data is risky; interpolation within it is safer." },
      { topicSlug: "fermi-estimation", prompt: "A problem solved by decomposing an unknown into estimable pieces and multiplying is a ____ problem.", correctAnswer: "fermi", explanation: "Fermi problems estimate the unknown from common-sense pieces." },
    ],
  },
  {
    kind: "midterm",
    title: "Midterm — Weeks 1 & 2",
    weekNumber: 2,
    isTimed: true,
    timeLimitMinutes: 60,
    instructions: "Cumulative midterm. 60 minutes. Pasting disabled.",
    problems: [
      { topicSlug: "numbers-magnitude-number-line", prompt: "Write the speed of light, 300,000,000 m/s, in scientific notation as 3 × 10^? (Give the exponent as a number.)", correctAnswer: "8", explanation: "300,000,000 = 3 × 10^8." },
      { topicSlug: "estimation-order-of-magnitude", prompt: "When estimating, you should round each quantity to how many significant figures? (A number.)", correctAnswer: "1", explanation: "Keeping one significant figure is the norm for quick estimates." },
      { topicSlug: "units-dimensions-sanity-checks", prompt: "Treating units as algebra you cancel and multiply is called dimensional ____.", correctAnswer: "analysis", explanation: "Dimensional analysis tracks units to catch errors." },
      { topicSlug: "ratios-rates-proportional-reasoning", prompt: "If 3 cups flour go with 1 cup sugar, how many cups of flour go with 4 cups of sugar? (A number.)", correctAnswer: "12", explanation: "Proportional reasoning: 3/1 = x/4, so x = 12." },
      { topicSlug: "quantitative-arguments-vs-noise", prompt: "'Our method is 37.6% more effective' with no measure of 'effective' is an example of irrelevant ____.", correctAnswer: "precision", explanation: "Irrelevant precision dresses up noise as evidence." },
      { topicSlug: "linear-vs-nonlinear-thinking", prompt: "Doubling a cube's side multiplies its volume by what factor? (A number.)", correctAnswer: "8", explanation: "Volume scales with the cube of length: 2^3 = 8 (the square–cube law)." },
      { topicSlug: "exponential-growth-decay", prompt: "Growth by a constant percentage each period is called ____ growth.", correctAnswer: "exponential", explanation: "Exponential growth multiplies by a fixed factor each period." },
      { topicSlug: "counting-combinatorics-possibility-spaces", prompt: "When order does NOT matter, a selection of items is called a ____ (not a permutation).", correctAnswer: "combination", explanation: "Combinations ignore order; permutations count order." },
    ],
  },

  // Week 3
  {
    kind: "homework",
    title: "Homework 3.1 — Statistics and distributions",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "descriptive-statistics-what-they-hide", prompt: "The mean, median, and mode are all measures of a distribution's ____.", correctAnswer: "center", explanation: "They are measures of central tendency (center)." },
      { topicSlug: "distributions-averages-outliers", prompt: "For income data skewed by a few huge values, which average is the fairer 'typical' value — mean or median?", correctAnswer: "median", explanation: "The median resists the pull of the long tail; the mean is dragged upward." },
      { topicSlug: "variation-spread-danger-of-mean", prompt: "The square root of the variance, giving spread in the original units, is the standard ____.", correctAnswer: "deviation", explanation: "Standard deviation measures spread in the data's own units." },
    ],
  },
  {
    kind: "homework",
    title: "Homework 3.2 — Probability and correlation",
    weekNumber: 3,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "probability-quantifying-uncertainty", prompt: "After 5 heads in a row, the probability the next fair flip is heads is still what? (A decimal.)", correctAnswer: "0.5", explanation: "Coins have no memory; expecting tails is the gambler's fallacy." },
      { topicSlug: "conditional-probability-base-rate-neglect", prompt: "Ignoring how common a condition is when reading a positive test result is base-rate ____.", correctAnswer: "neglect", explanation: "Base-rate neglect ignores prior prevalence, inflating the perceived risk." },
      { topicSlug: "correlation-causation-confounding", prompt: "A hidden third variable that influences both correlated quantities is called a ____.", correctAnswer: "confounder", explanation: "A confounder (like summer heat for ice cream and drownings) drives both." },
      { topicSlug: "sampling-bias-law-of-small-numbers", prompt: "Studying only successful companies and ignoring the failures is ____ bias.", correctAnswer: "survivorship", explanation: "Survivorship bias looks only at the survivors." },
    ],
  },
  {
    kind: "test",
    title: "Week 3 Test",
    weekNumber: 3,
    isTimed: true,
    timeLimitMinutes: 40,
    instructions: "Timed. 40 minutes. Pasting disabled.",
    problems: [
      { topicSlug: "descriptive-statistics-what-they-hide", prompt: "A numerator like '500 accidents' becomes far more meaningful when expressed as a ____ (e.g., per million trips).", correctAnswer: "rate", explanation: "A rate supplies the denominator a raw count omits." },
      { topicSlug: "variation-spread-danger-of-mean", prompt: "Drowning in a river that is '4 feet deep on average' illustrates the flaw of ____.", correctAnswer: "averages", explanation: "The flaw of averages ignores variation around the mean." },
      { topicSlug: "probability-quantifying-uncertainty", prompt: "For two independent events you find the probability that BOTH happen by ____ their probabilities.", correctAnswer: "multiplying", explanation: "P(A and B) = P(A) × P(B) for independent events." },
      { topicSlug: "conditional-probability-base-rate-neglect", prompt: "When a condition is rare, even an accurate test yields mostly ____ positives.", correctAnswer: "false", explanation: "The large healthy group produces many false positives — the false-positive paradox." },
      { topicSlug: "correlation-causation-confounding", prompt: "Correlation does not imply ____.", correctAnswer: "causation", explanation: "Association is not the same as cause and effect." },
    ],
  },

  // Week 4
  {
    kind: "homework",
    title: "Homework 4.1 — Graphs, fallacies, and risk",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "misleading-graphs-visualization", prompt: "A bar chart whose y-axis starts at 90 instead of 0 exaggerates change by using a ____ axis.", correctAnswer: "truncated", explanation: "A truncated axis magnifies small differences." },
      { topicSlug: "statistical-fallacies-number-abuse", prompt: "A trend that holds in every subgroup but reverses when groups are combined is ____'s paradox.", correctAnswer: "simpson", explanation: "Simpson's paradox arises from differing group sizes/baselines." },
      { topicSlug: "risk-expected-value-decisions", prompt: "Each outcome's value weighted by its probability, then summed, is the ____ value.", correctAnswer: "expected", explanation: "Expected value combines magnitude and probability." },
    ],
  },
  {
    kind: "homework",
    title: "Homework 4.2 — Studies, money, and misinformation",
    weekNumber: 4,
    isTimed: false,
    timeLimitMinutes: null,
    instructions: "Untimed practice.",
    problems: [
      { topicSlug: "evaluating-studies-polls-claims", prompt: "A study that can support causation (not just correlation) randomly assigns subjects and is called a randomized controlled ____.", correctAnswer: "trial", explanation: "Randomized controlled trials can establish causation." },
      { topicSlug: "financial-economic-reasoning", prompt: "A 3% raise during 4% inflation is, in real terms, a pay ____.", correctAnswer: "cut", explanation: "Real value falls because inflation outpaces the nominal raise." },
      { topicSlug: "detecting-quantitative-misinformation", prompt: "A scary statistic given with no traceable origin is missing what? (One word.)", correctAnswer: "source", explanation: "No traceable source is a top red flag for misinformation." },
      { topicSlug: "quantitative-reasoning-across-domains", prompt: "Using a reasoning skill learned in one area in a brand-new area is called ____.", correctAnswer: "transfer", explanation: "Transfer must be built deliberately by asking the same core questions everywhere." },
    ],
  },
  {
    kind: "final",
    title: "Final Exam — All weeks",
    weekNumber: 4,
    isTimed: true,
    timeLimitMinutes: 90,
    instructions: "Cumulative final. 90 minutes. Pasting disabled.",
    problems: [
      { topicSlug: "reading-reconstructing-quantitative-claims", prompt: "For any number you meet, the missing piece that turns a numerator into a real claim is the ____.", correctAnswer: "denominator", explanation: "A numerator without its denominator is an unfinished claim." },
      { topicSlug: "percentages-change-base-rates", prompt: "In the percentage-change formula, the base you divide by is the new value or the old value?", correctAnswer: "old", explanation: "Percent change = (new − old)/old; the base is the old value." },
      { topicSlug: "exponential-growth-decay", prompt: "The time for an exponentially decaying quantity to fall to half its value is its ____.", correctAnswer: "half-life", explanation: "Half-life is the time to halve under exponential decay." },
      { topicSlug: "fermi-estimation", prompt: "Fermi estimates land the right order of magnitude because over- and under-estimates tend to ____.", correctAnswer: "cancel", explanation: "Roughly random over/under guesses partly cancel when multiplied." },
      { topicSlug: "distributions-averages-outliers", prompt: "A value far from the rest of the data, which can distort the mean, is an ____.", correctAnswer: "outlier", explanation: "Outliers pull the mean and must be investigated, not ignored." },
      { topicSlug: "conditional-probability-base-rate-neglect", prompt: "P(A given B) is generally NOT equal to P(B given A); confusing them is the confusion of the ____.", correctAnswer: "inverse", explanation: "The confusion of the inverse swaps a conditional probability for its reverse." },
      { topicSlug: "correlation-causation-confounding", prompt: "Ice-cream sales and drownings both rise in summer because of a shared confounder — name it (one word).", correctAnswer: "heat", explanation: "Summer heat drives both; neither causes the other." },
      { topicSlug: "statistical-fallacies-number-abuse", prompt: "Running many tests and reporting only the one that looks significant is called p-____.", correctAnswer: "hacking", explanation: "p-hacking manufactures significance out of noise." },
      { topicSlug: "risk-expected-value-decisions", prompt: "'This drug doubles your risk' is meaningless without converting relative risk to ____ risk.", correctAnswer: "absolute", explanation: "Relative risk needs the absolute base rate to be informative." },
      { topicSlug: "capstone-synthesis", prompt: "A quantitative claim is worth believing when the numbers are real, the comparison is fair, the method is sound, and the magnitude actually ____.", correctAnswer: "matters", explanation: "Statistical significance is not enough; the effect must be large enough to matter." },
    ],
  },
];

export async function seedIfEmpty(): Promise<void> {
  const existing = await db.execute(sql`select count(*)::int as n from topics`);
  const row = (existing.rows[0] ?? {}) as { n?: number };
  if ((row.n ?? 0) > 0) {
    logger.info("Seed: already populated, skipping");
    return;
  }
  logger.info("Seed: populating course content");

  // Topics + lectures
  const slugToTopicId = new Map<string, number>();
  for (let i = 0; i < TOPICS.length; i++) {
    const t = TOPICS[i]!;
    const [inserted] = await db
      .insert(topicsTable)
      .values({
        slug: t.slug,
        title: t.title,
        weekNumber: t.weekNumber,
        blurb: t.blurb,
        position: i,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert topic ${t.slug}`);
    slugToTopicId.set(t.slug, inserted.id);
    await db.insert(lecturesTable).values({
      topicId: inserted.id,
      weekNumber: t.weekNumber,
      title: t.lectureTitle,
      body: t.body,
    });
  }

  // Assignments + problems
  for (let i = 0; i < ASSIGNMENTS.length; i++) {
    const a = ASSIGNMENTS[i]!;
    const [inserted] = await db
      .insert(assignmentsTable)
      .values({
        kind: a.kind,
        title: a.title,
        weekNumber: a.weekNumber,
        position: i,
        isTimed: a.isTimed,
        timeLimitMinutes: a.timeLimitMinutes,
        instructions: a.instructions,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert assignment ${a.title}`);
    for (let p = 0; p < a.problems.length; p++) {
      const prob = a.problems[p]!;
      const topicId = slugToTopicId.get(prob.topicSlug);
      if (!topicId) throw new Error(`Unknown topic slug ${prob.topicSlug}`);
      await db.insert(problemsTable).values({
        assignmentId: inserted.id,
        topicId,
        position: p,
        prompt: prob.prompt,
        correctAnswer: prob.correctAnswer,
        explanation: prob.explanation,
        hint: prob.hint ?? null,
      });
    }
  }

  logger.info({ topics: TOPICS.length, assignments: ASSIGNMENTS.length }, "Seed complete");
}
