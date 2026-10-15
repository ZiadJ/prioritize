# Prioritize

**A collaborative distribution and prioritization platform for communities that manage resources without money — the early implementation of the [HUMANIA governance model](https://docs.google.com/document/d/18r9iCYR5ZJVODkXw5sm0jIIELEIC1hNcGaeaKO0WM9U/edit?tab=t.0#heading=h.pbsl4ghqap3).**

**Try the live demo: https://humania-prioritize.vercel.app/dash/requests**

---

## About HUMANIA

For 300,000 years, humans lived free from rulership — sharing resources, making decisions together, taking what they needed and giving what they could. With the rise of agriculture, land was divided, hearts grew cold, and necessities went behind a paywall. Today the profit incentive endangers our future: it fuels egocentricity and competition, disrupting our innate evolutionary adaptations as social beings.

**HUMANIA** is a societal blueprint designed to reconnect us and unlock our potential for abundance. It reclaims our humanity by putting human well-being first while questioning limiting beliefs and outdated norms. By merging scientific governance with empathy, it addresses the structural elements that shape mind and behavior to bring about peace, personal fulfillment and collective happiness.

One of the biggest problems with the monetary system is that it **monetizes scarcity**: it introduces parasitic incentives that distort our priorities, valuing a forest only when it is cut down. HUMANIA proposes a scientific approach to sustainable abundance instead, built around communities of roughly **150 people** (Dunbar's number) — small enough for close, stable relationships, yet large enough to benefit from economies of scale. Progress then hinges on:

- Automating basic needs (primarily food, shelter and energy)
- Structural support for mutuality and fairness
- Ensuring satisfactory standards of living for everyone
- Managing resources cooperatively using science — beyond markets and abstractions like money

**Prioritize** is the software that makes this model actionable: it structures collective decisioning as a transparent, algorithmic process where human needs are weighted against real, measurable resource availability.

## The Governance Process

The app implements a stepwise, moneyless governance workflow:

1. **Define a request** — a personal need or concern, broken down into a hierarchy of goals and subgoals that everyone can rate by desirability and urgency, differentiating desires from needs.
2. **Gather critical information** — being mindful about false assumptions and identifying blind spots or biases that may lead to inconsistent expectations.
3. **Brainstorm proposals** — ideas for each goal/subgoal, evaluated with regard to urgency and available resources (including volunteer hours), then decomposed into actionable steps.
4. **Estimate resource consumption** — using a shared inventory system, each step's consumption is computed recursively in natural units (mass, energy, man-hours), accounting for potential knock-on effects.
5. **Compute feasibility** — based on expert analysis of long-term labor availability and land biocapacity, while ensuring compliance with risk and vulnerability standards.
6. **Rate results** — experts rate each proposal-to-subgoal relationship by effectiveness and confidence.
7. **Rank and recompose** — the net value of every proposal is computed from ratings and feasibility scores to identify the optimal course of action.
8. **Act** — dispatch within schedule, keep everyone in the loop, stay responsive to feedback and environmental changes.
9. **Evaluate** — feed results back into future decisions and repeat.

To ensure the most critical needs are addressed first, members are regularly granted a set number of **non-transferable points**, which they freely allocate according to their needs, preferences and goals. Requests that accumulate the greatest number of points receive top priority; points are automatically cleared once a request is fulfilled.

## How Prioritization Is Computed

Each request is structured as a hierarchy of goals and subgoals, and the community is invited to submit proposals for them — organized as a hybrid tree-table where the goal hierarchy forms the first column and each proposal gets its own column. Each proposal is broken down into distinct steps, creating a matrix where every proposal-to-subgoal relationship can be rated individually.

- **Benefit** — subgoals are rated by desirability. The collective benefit for a proposal is computed from the `benefit · effectiveness · confidence` product for all subgoals, aggregated up the hierarchy. In critical areas, assessment can be restricted to experts, with less experienced raters assigning lower confidence.
- **Side effects** — every identified side effect is nested under its subgoal so experts (and anyone impacted) can rate its positive or negative impact, exposing harmful feedback loops before action is taken.
- **Feasibility** — resource requirements for each step are retrieved from the shared global inventory (labor hours, energy, mass/volume/area/length, processing and delivery time). Per-resource feasibility is:

  ```
  Feasibility = 1 − (Cost Qty + Side-Effect Cost Qty + Consumption Rate × Time)
                ────────────────────────────────────────────────────────────
                (Stock Qty + Renewal Rate × Time)
  ```

  The **net feasibility** of a proposal is the product of feasibility values across all resources it consumes — if a single step is infeasible, the entire proposal is.
- **Proposal value** — since a proposal's value rises with both benefit and feasibility:

  ```
  Proposal Value = Net Benefit × Net Feasibility
  ```

Proposals that lack sufficient resources are queued and automatically re-evaluated as the inventory replenishes, forming the foundation of a cybernetic, resource-based democracy.

## Features

- **Request & goal hierarchies** — break any request into a tree of goals and subgoals that the community can collaboratively refine, with duplicate detection and variant support
- **Collaborative proposals** — community-submitted proposals decomposed into ordered steps with durations, risk factors and assigned contributors
- **Expert-weighted feedback** — effectiveness and confidence ratings, expertise gating for critical areas, and cognitive-bias flagging for consistency
- **Side-effect tracking** — beneficial and detrimental effects with typed relations (enabler, disabler, multiplier, incrementor) and inter-effect linkages
- **Shared inventory** — resources in natural units with stock quantities, monthly renewal capacity, shelf life and transport cost data
- **Feasibility engine** — automatic per-step and per-proposal feasibility computation from live inventory data (`lib/stepCostsFeasibility.ts`)
- **Full traceability** — every stock movement is logged with before/after quantities and reasons
- **Points-based prioritization** — non-transferable priority points allocated by individual need

## Tech Stack

| Layer      | Technology                                          |
| ---------- | --------------------------------------------------- |
| Framework  | Nuxt 4 / Vue 3 / TypeScript                         |
| API        | tRPC + Zod validation         |
| Database   | Prisma 7 + PostgreSQL (with PostGIS)                |
| UI         | PrimeVue 4, Tailwind CSS, Quill                     |
| State      | Pinia, VueUse                                       |
| Auth       | JWT + refresh tokens (sidebase/nuxt-auth)           |

## Getting Started

### Prerequisites

- Node.js
- A PostgreSQL database (the project currently uses Supabase in development, with PostGIS enabled)

### Installation

Clone the repository and run the following commands:

```bash
# Clone the repository
git clone https://github.com/ZiadJ/prioritize

# Navigate to the project directory
cd prioritize

# Install dependencies
npm install

# Generate Prisma files
npx prisma generate

# Create .env file and fill in a Postgres DB url (currently using Supabase)
cp .env.example .env    # Windows: copy .env.example .env

# Initialize database
npx prisma db push

# Insert sample data
npx prisma db seed

# Start the development server
npm run dev
```

## Status & Roadmap

This is an **early version** under active development — a pilot aiming to demonstrate the efficacy of applying technology and scientific methodology to societal organization. Expected outcomes as the model matures:

- Basic-need security through open-source automation
- Fair, participatory resource allocation and collective intelligence
- A pro-abundance economy built on low-labor, high-yield win-win principles
- Voluntary labor, autonomy and intrinsic incentivization
- Solidarity, sustainability and seamless integration with nature

## Contributing

Contributions, discussions and feedback are welcome — whether on the codebase, the governance process or the computation model. Feel free to open an issue or submit a pull request.

