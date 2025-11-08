# Complete Guide to the Ax Framework

**The TypeScript Framework for Building Reliable AI Applications**

Version: Latest (as of 2025)
Repository: [ax-llm/ax](https://github.com/ax-llm/ax)
License: Apache 2.0

---

## Table of Contents

1. [Introduction](#introduction)
2. [Core Concepts](#core-concepts)
3. [Getting Started](#getting-started)
4. [Signatures: The Heart of Ax](#signatures-the-heart-of-ax)
5. [AI Provider Configuration](#ai-provider-configuration)
6. [Working with Programs](#working-with-programs)
7. [Advanced Features](#advanced-features)
8. [AxFlow: Workflow Orchestration](#axflow-workflow-orchestration)
9. [Optimization Techniques](#optimization-techniques)
10. [AxRAG: Advanced Retrieval](#axrag-advanced-retrieval)
11. [Agents and Multi-Agent Systems](#agents-and-multi-agent-systems)
12. [Observability and Telemetry](#observability-and-telemetry)
13. [Best Practices](#best-practices)
14. [Examples and Use Cases](#examples-and-use-cases)

---

## Introduction

### What is Ax?

Ax is a TypeScript framework for building reliable AI applications, often described as "the pretty much 'official' DSPy framework for TypeScript." It brings structured, declarative programming patterns to LLM development, eliminating the need for manual prompt engineering.

**Tagline:** "Stop wrestling with prompts. Start shipping AI features."

### Why Ax?

Traditional LLM development involves:
- Manual prompt crafting and tweaking
- Brittle string templates
- Provider-specific code
- Difficult validation and type safety
- Complex streaming implementations

Ax solves these problems by:
- **Declarative Signatures**: Define what you want, not how to get it
- **Type Safety**: Full TypeScript support with compile-time checking
- **Provider Agnostic**: Support for 15+ LLM providers with single-line switching
- **Automatic Optimization**: MiPRO, ACE, and GEPA for improving performance
- **Production Ready**: Built-in streaming, validation, and observability

### Key Statistics

- **2.2k+ GitHub Stars**
- **15+ LLM Providers** supported
- **70+ Examples** covering common patterns
- **Zero External Dependencies**
- **Apache 2.0 Licensed**

---

## Core Concepts

### DSPy Philosophy

Ax is inspired by DSPy (Declarative Self-improving Python), which introduces a paradigm shift from imperative prompt engineering to declarative program specification.

**Traditional Approach:**
```typescript
const prompt = `You are a sentiment analyzer. Please analyze the following review
and determine if it is positive, negative, or neutral. Be sure to consider context
and nuance. Review: ${reviewText}`;
```

**Ax Approach:**
```typescript
const classifier = ax('review:string -> sentiment:class "positive, negative, neutral"');
```

### Key Principles

1. **Declarative Over Imperative**: Specify inputs and outputs, let the framework handle prompt generation
2. **Structural Certainty with Flexibility**: Enforce type safety while remaining provider-agnostic
3. **Optimization as First-Class**: Programs can be automatically improved through training
4. **Composition**: Complex workflows from simple, composable signatures

### Architecture Overview

Ax employs a three-layer architecture:

1. **AI Provider Layer** (`src/ax/ai/`): Unified interface for multiple LLM providers
2. **DSP Layer** (`src/ax/dsp/`): Core execution with signatures, validation, and program logic
3. **Orchestration Layer** (`src/ax/flow/`): Workflow management with DAG-based execution

---

## Getting Started

### Installation

```bash
npm install @ax-llm/ax
```

### Your First Program (2 Minutes)

```typescript
import { ai, ax } from "@ax-llm/ax";

// 1. Configure your LLM provider
const llm = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!
});

// 2. Define what you want using a signature
const classifier = ax(
  'review:string -> sentiment:class "positive, negative, neutral"'
);

// 3. Execute with forward()
const result = await classifier.forward(llm, {
  review: "This product is amazing!",
});

console.log(result.sentiment); // "positive"
```

### Environment Setup

Create a `.env` file:

```bash
OPENAI_APIKEY=your-openai-key
ANTHROPIC_APIKEY=your-anthropic-key
GOOGLE_APIKEY=your-google-key
```

Load it in your application:

```typescript
import 'dotenv/config';
```

### Running Examples

The Ax repository includes 70+ examples:

```bash
# Clone the repository
git clone https://github.com/ax-llm/ax.git
cd ax

# Install dependencies
npm install

# Run an example
export OPENAI_APIKEY=your-key
npm run tsx ./src/examples/extract.ts
```

---

## Signatures: The Heart of Ax

### What are Signatures?

Signatures define contracts between your code and language models. They describe **what** you need rather than **how** to obtain it.

### Basic Syntax

```
[description] input1:type, input2:type -> output1:type, output2:type
```

Components:
- **Optional description**: Context for the signature
- **Input fields**: Comma-separated with names and types
- **Arrow separator** (`->`): Divides inputs from outputs
- **Output fields**: What the LLM should generate

### Example Signatures

**Simple Classification:**
```typescript
'review:string -> sentiment:class "positive, negative, neutral"'
```

**Multi-input, Multi-output:**
```typescript
'customerEmail:string, currentDate:datetime -> priority:class "high, normal, low", sentiment:class "positive, negative, neutral", ticketNumber?:number'
```

**With Description:**
```typescript
'"Analyze customer support tickets" email:string -> urgency:class "critical, high, medium, low", category:string, suggestedResponse:string'
```

### Type System

#### Basic Types

- **string**: Text data
- **number**: Numeric values
- **boolean**: True/false values
- **json**: Structured JSON data

#### Temporal Types

- **date**: Date without time
- **datetime**: Date with time

#### Media Types (Input Only)

- **image**: Image data
- **audio**: Audio data
- **file**: File uploads
- **url**: URLs

#### Specialized Types

- **code**: Code snippets with syntax awareness
- **class**: Classification with enumerated options
  ```typescript
  'text:string -> category:class "spam, not-spam"'
  'text:string -> tone:class "formal, casual, aggressive, friendly"'
  ```

### Field Modifiers

#### Arrays

Append `[]` to any type:

```typescript
'document:string -> keywords:string[], dates:datetime[], scores:number[]'
```

#### Optional Fields

Prefix with `?`:

```typescript
'email:string -> ticketNumber?:number, assignee?:string'
```

#### Internal Fields

Mark with `!` for chain-of-thought reasoning (not returned):

```typescript
'question:string -> thinking!:string, reasoning!:string, answer:string'
```

### Fluent Builder API

For complex signatures, use the fluent builder:

```typescript
import { f } from "@ax-llm/ax";

const signature = f()
  .input("userQuestion", f.string("User's question"))
  .input("context", f.string("Background context").optional())
  .output("answer", f.string("AI response"))
  .output("confidence", f.number("Confidence score 0-1"))
  .output("sources", f.string("Citation sources").array())
  .build();

const gen = new AxGen(signature);
```

### Signature Best Practices

1. **Use Descriptive Names**: Avoid generic terms like "text", "data", "input"
   - ❌ Bad: `text:string -> result:string`
   - ✅ Good: `customerReview:string -> sentimentAnalysis:class "positive, negative, neutral"`

2. **Be Specific with Classes**: Enumerate all possible values
   ```typescript
   'email:string -> priority:class "critical, high, medium, low"'
   ```

3. **Use Internal Fields for Reasoning**: Improve quality without cluttering output
   ```typescript
   'problem:string -> analysis!:string, solution:string'
   ```

4. **Leverage Optional Fields**: Only request what might be present
   ```typescript
   'text:string -> phoneNumber?:string, email?:string'
   ```

---

## AI Provider Configuration

### Supported Providers

Ax supports 15+ LLM providers:

- **OpenAI** (GPT-4, GPT-3.5, etc.)
- **Anthropic** (Claude Sonnet, Opus, Haiku)
- **Google** (Gemini Pro, Flash, etc.)
- **Mistral AI**
- **Groq**
- **Cohere**
- **Together AI**
- **DeepSeek**
- **Ollama** (local models)
- And more...

### Basic Provider Setup

```typescript
import { ai } from "@ax-llm/ax";

// OpenAI
const openai = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
});

// Anthropic (Claude)
const claude = ai({
  name: "anthropic",
  apiKey: process.env.ANTHROPIC_APIKEY!,
});

// Google Gemini
const gemini = ai({
  name: "google-gemini",
  apiKey: process.env.GOOGLE_APIKEY!,
});

// Ollama (local)
const ollama = ai({
  name: "ollama",
  config: { model: "llama2" },
});
```

### Model Presets

Define friendly-name presets for different models:

```typescript
import { AxAIOpenAIModel, ai } from "@ax-llm/ax";

const llm = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  models: [
    {
      key: "fast",
      model: AxAIOpenAIModel.GPT4OMini,
      description: "Fast model for simple tasks",
      config: { temperature: 0.3, maxTokens: 500 }
    },
    {
      key: "smart",
      model: AxAIOpenAIModel.GPT4O,
      description: "Smart model for complex reasoning",
      config: { temperature: 0.7, maxTokens: 2000 }
    },
    {
      key: "creative",
      model: AxAIOpenAIModel.GPT4O,
      description: "High temperature for creative tasks",
      config: { temperature: 1.0 }
    }
  ]
});

// Use presets by key
const result = await gen.forward(llm, values, { model: "smart" });
```

### Configuration Options

```typescript
const llm = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  config: {
    model: AxAIOpenAIModel.GPT4O,
    temperature: 0.7,           // Randomness (0-2)
    maxTokens: 1000,            // Max response length
    topP: 0.9,                  // Nucleus sampling
    presencePenalty: 0.0,       // Penalize new topics
    frequencyPenalty: 0.0,      // Penalize repetition
    thinkingTokenBudget: 5000,  // For o1 models
    showThoughts: true,         // Display reasoning
  },
  options: {
    timeout: 30000,             // Request timeout (ms)
    debug: true,                // Enable debug logging
  }
});
```

### Switching Providers

One of Ax's strengths is easy provider switching:

```typescript
// Start with OpenAI
const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

// Switch to Claude - same program, different provider
const llm = ai({ name: "anthropic", apiKey: process.env.ANTHROPIC_APIKEY! });

// Switch to local Ollama
const llm = ai({ name: "ollama", config: { model: "llama2" } });

// Your program code stays the same!
const result = await classifier.forward(llm, values);
```

### Chat Requests

For conversational interfaces:

```typescript
const response = await llm.chat({
  chatPrompt: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "What is the capital of France?" }
  ],
  temperature: 0.7,
  maxTokens: 500
});

console.log(response.results[0].content);
```

### Embeddings

For models supporting embeddings:

```typescript
const embedding = await llm.embed({
  texts: ["Hello world", "Another document"],
  embedModel: "text-embedding-ada-002"
});

console.log(embedding.embeddings[0]); // Vector array
```

---

## Working with Programs

### AxGen: Core Program Execution

`AxGen` is the foundation for executing signatures:

```typescript
import { AxGen, ai } from "@ax-llm/ax";

const gen = new AxGen<{ review: string }>({
  signature: 'review:string -> sentiment:class "positive, negative, neutral", confidence:number',
});

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const result = await gen.forward(llm, {
  review: "Great product, highly recommend!"
});

console.log(result.sentiment);   // "positive"
console.log(result.confidence);  // 0.95
```

### Shorthand Syntax

Use the `ax()` helper for concise programs:

```typescript
import { ax, ai } from "@ax-llm/ax";

const classifier = ax('review:string -> sentiment:class "positive, negative, neutral"');
const result = await classifier.forward(llm, { review: "Love it!" });
```

### Streaming Responses

Stream results in real-time:

```typescript
const gen = ax('question:string -> answer:string');

const stream = await gen.streamingForward(llm, {
  question: "What is quantum computing?"
});

for await (const chunk of stream) {
  console.log(chunk.answer); // Incremental updates
}
```

### Few-Shot Learning

Provide examples to guide the model:

```typescript
const gen = ax('review:string -> sentiment:class "positive, negative, neutral"');

gen.setDemos([
  {
    review: "Excellent product, exceeded expectations!",
    sentiment: "positive"
  },
  {
    review: "Terrible quality, waste of money",
    sentiment: "negative"
  },
  {
    review: "It's okay, nothing special",
    sentiment: "neutral"
  }
]);

const result = await gen.forward(llm, {
  review: "Pretty good overall"
});
```

### Assertions and Validation

Validate outputs during generation:

```typescript
const gen = ax('text:string -> summary:string');

// Add assertion
gen.setAssertions([
  {
    fn: ({ summary }) => summary.split(' ').length <= 50,
    message: "Summary must be 50 words or less"
  }
]);

const result = await gen.forward(llm, { text: longDocument });
// If assertion fails, LLM will retry automatically
```

Multiple assertion types:

```typescript
// Boolean assertion
gen.setAssertions([
  {
    fn: ({ email }) => email.includes('@'),
    message: "Must be valid email"
  }
]);

// Throw exception
gen.setAssertions([
  {
    fn: ({ price }) => {
      if (price < 0) throw new Error("Price cannot be negative");
    }
  }
]);

// Return error message
gen.setAssertions([
  {
    fn: ({ summary }) => {
      const words = summary.split(' ').length;
      if (words > 50) return `Too long (${words} words). Keep under 50.`;
      return true;
    }
  }
]);
```

---

## Advanced Features

### Function Calling (ReAct Pattern)

Enable LLMs to call external functions:

```typescript
import { ax, ai } from "@ax-llm/ax";

const functions = [
  {
    name: 'getCurrentWeather',
    description: 'Get the current weather for a location',
    parameters: {
      type: 'object' as const,
      properties: {
        location: {
          type: 'string',
          description: 'City name'
        },
        units: {
          type: 'string',
          enum: ['celsius', 'fahrenheit'],
          default: 'fahrenheit'
        }
      },
      required: ['location']
    },
    func: async (args: { location: string; units: string }) => {
      // Call weather API
      return `Weather in ${args.location} is 72°${args.units === 'celsius' ? 'C' : 'F'}`;
    }
  },
  {
    name: 'searchNews',
    description: 'Search for recent news articles',
    parameters: {
      type: 'object' as const,
      properties: {
        query: { type: 'string' }
      },
      required: ['query']
    },
    func: async (args: { query: string }) => {
      // Call news API
      return "Recent articles about " + args.query;
    }
  }
];

const assistant = ax('question:string -> answer:string', {
  functions,
});

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const result = await assistant.forward(llm, {
  question: "What's the weather like in Tokyo?"
});

console.log(result.answer);
// LLM will automatically call getCurrentWeather and formulate response
```

### Multi-Modal Processing

Handle images, audio, and files:

```typescript
import { ax, ai } from "@ax-llm/ax";
import fs from 'fs';

const analyzer = ax(`
  image:image, question:string ->
  description:string,
  mainColors:string[],
  category:class "electronics, clothing, food, other",
  estimatedPrice:string
`);

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const imageBuffer = fs.readFileSync('./product.jpg');

const result = await analyzer.forward(llm, {
  image: imageBuffer,
  question: "What product is this?"
});

console.log(result.description);
console.log(result.mainColors);
console.log(result.category);
```

### Complex Extraction

Extract structured data from unstructured text:

```typescript
const extractor = ax(`
  customerEmail:string, currentDate:datetime ->
  priority:class "critical, high, normal, low",
  sentiment:class "positive, negative, neutral",
  ticketNumber?:number,
  nextSteps:string[],
  estimatedResponseTime:string,
  requiresHumanReview:boolean
`);

const email = `
Hi, I'm having issues with order #12345.
The product arrived damaged and I need a refund ASAP!
`;

const result = await extractor.forward(llm, {
  customerEmail: email,
  currentDate: new Date()
});

console.log(result.priority);              // "high"
console.log(result.sentiment);             // "negative"
console.log(result.ticketNumber);          // 12345
console.log(result.nextSteps);             // ["Issue refund", "Send replacement"]
console.log(result.requiresHumanReview);   // true
```

---

## AxFlow: Workflow Orchestration

### What is AxFlow?

AxFlow is a declarative workflow orchestration framework for building sophisticated multi-step AI applications with automatic parallelization and dependency management.

### Key Features

- **Automatic Dependency Analysis**: Parallel execution of independent operations
- **Type-Safe State Management**: Progressive state evolution with predictable naming
- **Flexible Control Flow**: Sequential, conditional, parallel, and iterative patterns
- **1.5-3x Speedup**: Through intelligent parallelization

### Basic Sequential Flow

```typescript
import { AxFlow, ai, ax } from "@ax-llm/ax";

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const flow = new AxFlow()
  .n("extract", ax('email:string -> topic:string, urgency:class "high, medium, low"'))
  .n("categorize", ax('topic:string -> category:class "billing, technical, general"'))
  .n("respond", ax('category:string, urgency:string -> response:string'))
  .returns<{ response: string }>();

const result = await flow.run(llm, {
  email: "I need help with my billing invoice immediately!"
});

console.log(result.response);
```

### State Management

AxFlow tracks state through result accumulation:

```typescript
const flow = new AxFlow()
  .n("step1", program1)  // Creates `step1Result` in state
  .n("step2", program2)  // Can access `step1Result`, creates `step2Result`
  .n("step3", program3)  // Can access both `step1Result` and `step2Result`
  .returns<FinalType>();
```

### Automatic Parallelization

Independent operations run automatically in parallel:

```typescript
const flow = new AxFlow()
  .n("sentiment", ax('text:string -> sentiment:class "positive, negative, neutral"'))
  .n("keywords", ax('text:string -> keywords:string[]'))
  .n("summary", ax('text:string -> summary:string'))
  // All three run in parallel - they only depend on input `text`
  .n("report", ax('sentiment:string, keywords:string[], summary:string -> report:string'))
  // This runs after all three complete
  .returns<{ report: string }>();

// This achieves ~3x speedup compared to sequential execution
```

### Conditional Branching

```typescript
const flow = new AxFlow()
  .n("classify", ax('email:string -> isSpam:boolean'))
  .branch()
    .when(({ classifyResult }) => classifyResult.isSpam === true)
      .n("moveToSpam", spamHandler)
    .when(({ classifyResult }) => classifyResult.isSpam === false)
      .n("processEmail", emailProcessor)
  .merge()
  .returns<ProcessResult>();
```

### Loops and Iteration

```typescript
const flow = new AxFlow()
  .n("initial", ax('text:string -> draft:string'))
  .label("improveLoop")
  .n("evaluate", ax('draft:string -> quality:number'))
  .while(({ evaluateResult }) => evaluateResult.quality < 0.9)
    .n("improve", ax('draft:string, quality:number -> draft:string'))
    .feedback("improveLoop", 5) // Max 5 iterations
  .endWhile()
  .returns<{ draft: string }>();
```

### Parallel Map Operations

Process arrays in parallel:

```typescript
const flow = new AxFlow()
  .n("fetchDocuments", async () => {
    return { documents: ["doc1", "doc2", "doc3"] };
  })
  .m("analyzeDoc", ax('document:string -> summary:string'), {
    items: ({ fetchDocumentsResult }) => fetchDocumentsResult.documents
  })
  // All documents analyzed in parallel
  .returns<{ analyzeDocResult: string[] }>();
```

### Async Transformations

```typescript
const flow = new AxFlow()
  .n("getUser", async ({ userId }: { userId: string }) => {
    const user = await database.users.findOne({ id: userId });
    return { user };
  })
  .n("analyze", ax('user:json -> insights:string'))
  .returns<{ insights: string }>();
```

### Quality Improvement Loop Example

```typescript
const improveDocument = new AxFlow()
  .n("generate", ax('topic:string -> document:string'))
  .label("qualityCheck")
  .n("evaluate", ax('document:string -> score:number, issues:string[]'))
  .while(({ evaluateResult }) => evaluateResult.score < 0.85)
    .n("fix", ax('document:string, issues:string[] -> document:string'))
    .feedback("qualityCheck", 3)
  .endWhile()
  .returns<{ document: string }>();
```

### Concise Syntax with Aliases

```typescript
const flow = new AxFlow()
  .n("a", program1)  // .n() instead of .node()
  .m("b", program2)  // .m() instead of .map()
  .returns<Result>();
```

---

## Optimization Techniques

### Why Optimize?

Manual prompt engineering is:
- Time-consuming
- Brittle
- Difficult to maintain
- Hard to improve systematically

Ax optimization:
- Automatically writes better prompts
- Selects optimal few-shot examples
- Tunes model configuration
- Achieves **50-80% cost reduction** while improving accuracy

### When to Optimize

**✅ Good Use Cases:**
- Classification tasks (sentiment, categorization, routing)
- Structured extraction
- Tasks with clear right/wrong answers
- Production systems with performance requirements

**❌ Not Suitable:**
- Creative writing
- Tasks without clear success metrics
- Very few training examples available (<5)

### Optimization Workflow

1. **Create Training Examples** (5-10+ diverse samples)
2. **Define Success Metrics** (custom scoring function)
3. **Run Optimization** (1-2 minutes typically)
4. **Apply Results** (demos + instructions)
5. **Save for Production** (portable JSON format)

### Training Examples Format

```typescript
const trainingExamples = [
  {
    // Inputs
    review: "Great product, highly recommend!",
    // Expected outputs
    sentiment: "positive",
    confidence: 0.95
  },
  {
    review: "Terrible quality, broke after one day",
    sentiment: "negative",
    confidence: 0.9
  },
  {
    review: "It's okay, nothing special",
    sentiment: "neutral",
    confidence: 0.7
  },
  // Add 5-10+ diverse examples
];
```

### Success Metrics

```typescript
const metric = (prediction: any, example: any) => {
  // Perfect match
  if (prediction.sentiment === example.sentiment) {
    return 1.0;
  }

  // Partial credit for close matches
  if (prediction.sentiment === "neutral" && example.sentiment === "positive") {
    return 0.3;
  }

  // Wrong
  return 0.0;
};
```

---

## MiPRO: Multi-Prompt Optimization

### What is MiPRO?

MiPRO (Multi-Prompt Optimization) automatically enhances AI programs by:
- Writing better prompt instructions
- Selecting optimal few-shot examples
- Tuning configuration parameters

**Key Results:**
- 70% → 90% accuracy improvements
- 50-80% cost reduction
- Works with just 5-10 training examples

### Basic MiPRO Usage

```typescript
import { AxMiPRO, ax, ai } from "@ax-llm/ax";

// 1. Define your program
const program = ax('review:string -> sentiment:class "positive, negative, neutral"');

// 2. Create training examples
const examples = [
  { review: "Love this product!", sentiment: "positive" },
  { review: "Waste of money", sentiment: "negative" },
  { review: "It's okay", sentiment: "neutral" },
  // ... more examples
];

// 3. Define metric
const metric = (pred: any, example: any) => {
  return pred.sentiment === example.sentiment ? 1 : 0;
};

// 4. Configure LLMs
const studentLLM = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  config: { model: "gpt-4o-mini" } // Cheap model
});

const teacherLLM = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  config: { model: "gpt-4o" } // Smart model for optimization
});

// 5. Run optimization
const optimizer = new AxMiPRO({
  trainExamples: examples,
  testExamples: examples.slice(0, 3), // Hold out some for testing
  metric,
});

const optimizedProgram = await optimizer.compile({
  program,
  student: studentLLM,
  teacher: teacherLLM,
  maxRounds: 10,
  maxDemos: 5,
});

// 6. Use optimized program
const result = await optimizedProgram.forward(studentLLM, {
  review: "Pretty good overall"
});
```

### Saving and Loading

```typescript
// Save optimization
const optimizationData = optimizedProgram.toJSON();
fs.writeFileSync('optimization.json', JSON.stringify(optimizationData));

// Load and apply
const savedData = JSON.parse(fs.readFileSync('optimization.json', 'utf-8'));
const loadedProgram = new AxOptimizedProgramImpl(savedData);

const result = await loadedProgram.forward(llm, inputs);
```

### MiPRO Configuration

```typescript
const optimizer = new AxMiPRO({
  trainExamples,
  testExamples,
  metric,
  maxTokenBudget: 100000,        // Limit optimization cost
  miniBatchSize: 25,             // Examples per batch
  seed: 42,                      // Reproducibility
  promptCandidates: 10,          // Instructions to try
  demoCandidates: 20,            // Demo sets to evaluate
});
```

### Teacher-Student Architecture

Use expensive model for optimization, cheap model for production:

```typescript
// Optimization phase (one-time cost)
const teacher = ai({
  name: "openai",
  config: { model: "gpt-4o" } // $$$
});

const student = ai({
  name: "openai",
  config: { model: "gpt-4o-mini" } // $
});

const optimized = await optimizer.compile({
  program,
  student,  // Gets optimized
  teacher,  // Helps with optimization
});

// Production (use cheap model)
const result = await optimized.forward(student, inputs);
// Now gpt-4o-mini performs like gpt-4o at 50x lower cost!
```

---

## GEPA: Multi-Objective Optimization

### What is GEPA?

GEPA (Genetic Evolutionary Programming with Agents) handles multi-objective optimization when you care about multiple competing goals:

- **Accuracy AND Speed**
- **Quality AND Cost**
- **Precision AND Recall**

Returns a **Pareto frontier** of trade-off solutions.

### When to Use GEPA

**✅ Use GEPA when:**
- You have competing objectives
- Need to balance trade-offs
- Want multiple solution options

**❌ Use MiPRO when:**
- Single objective (just accuracy)
- Simple classification
- Rapid prototyping

### Basic GEPA Usage

```typescript
import { AxGEPA, ax, ai } from "@ax-llm/ax";

const program = ax('email:string -> category:string');

// Multi-metric function
const metric = (pred: any, example: any) => {
  const accuracy = pred.category === example.category ? 1 : 0;

  // Brevity: shorter responses score higher
  const brevity = Math.max(0, 1 - pred.category.length / 100);

  return {
    accuracy,
    brevity
  };
};

const optimizer = new AxGEPA({
  trainExamples: examples,
  metric,
  maxMetricCalls: 100,  // Budget constraint
  paretoMetricKey: 'accuracy', // Primary objective for tie-breaking
});

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const optimized = await optimizer.compile({
  program,
  student: llm,
  teacher: llm,
});

// Returns Pareto-optimal solution
const result = await optimized.forward(llm, inputs);
```

### Pareto Frontier Analysis

```typescript
// GEPA returns multiple solutions on the Pareto frontier
const solutions = optimizer.getParetoFrontier();

solutions.forEach((sol, i) => {
  console.log(`Solution ${i}:`);
  console.log(`  Accuracy: ${sol.metrics.accuracy}`);
  console.log(`  Speed: ${sol.metrics.speed}`);
  console.log(`  Cost: ${sol.metrics.cost}`);
});

// Select based on business priorities
const bestForProduction = solutions.find(s =>
  s.metrics.accuracy > 0.85 && s.metrics.cost < 0.02
);
```

### GEPA Flow

For multi-step pipelines:

```typescript
import { AxGEPAFlow } from "@ax-llm/ax";

const workflow = new AxFlow()
  .n("extract", extractProgram)
  .n("classify", classifyProgram)
  .n("respond", respondProgram)
  .returns<Result>();

const optimizer = new AxGEPAFlow({
  trainExamples,
  metric: (pred, example) => ({
    accuracy: computeAccuracy(pred, example),
    latency: pred.latency,
    cost: pred.cost
  }),
  maxMetricCalls: 150,
});

const optimized = await optimizer.compile({
  flow: workflow,
  student: llm,
  teacher: llm,
});
```

---

## ACE: Agentic Context Engineering

### What is ACE?

ACE (Agentic Context Engineering) is a structured approach to evolving AI program context through iterative refinement. Unlike traditional optimization, ACE maintains a **persistent, evolving playbook** that grows over time.

### Key Difference from MiPRO

- **MiPRO**: One-time optimization, best for classification
- **ACE**: Continuous learning, structured memory, prevents context collapse

### The Problem ACE Solves

Traditional prompt optimization suffers from:
- **Brevity bias**: Prompts get shorter over iterations
- **Context collapse**: Hard-won strategies disappear
- **No memory**: Cannot accumulate knowledge over time

ACE solves this with structured, incremental updates.

### ACE Components

1. **Generator**: Your core program performing the task
2. **Reflector**: Analyzes performance and identifies improvements
3. **Curator**: Updates the playbook incrementally

### Basic ACE Usage

```typescript
import { AxACE, ax, ai } from "@ax-llm/ax";

const program = ax('question:string -> answer:string');

const examples = [
  { question: "What is photosynthesis?", answer: "..." },
  { question: "Explain quantum entanglement", answer: "..." },
  // More examples
];

const metric = (pred: any, example: any) => {
  // Custom scoring logic
  return similarity(pred.answer, example.answer);
};

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const optimizer = new AxACE({
  trainExamples: examples,
  metric,
  maxRounds: 5,
});

const optimized = await optimizer.compile({
  program,
  student: llm,
  teacher: llm,
});

// The playbook is saved in the optimized program
const result = await optimized.forward(llm, {
  question: "How does CRISPR work?"
});
```

### Two Learning Modes

#### Offline Optimization

Batch training on examples:

```typescript
const optimizer = new AxACE({
  trainExamples: offlineExamples,
  metric,
  maxRounds: 10,
});

const trained = await optimizer.compile({
  program,
  student: llm,
  teacher: llm,
});

// Save playbook
fs.writeFileSync('playbook.json', JSON.stringify(trained.toJSON()));
```

#### Online Adaptation

Real-time updates during production:

```typescript
// Load existing playbook
const playbook = JSON.parse(fs.readFileSync('playbook.json'));
const program = new AxOptimizedProgramImpl(playbook);

// Use in production
const result = await program.forward(llm, input);

// If quality is low, update playbook
if (userFeedback === "poor") {
  const updatedPlaybook = await optimizer.updateOnline({
    currentPlaybook: playbook,
    newExample: { input, correctOutput: userCorrection },
  });

  fs.writeFileSync('playbook.json', JSON.stringify(updatedPlaybook));
}
```

### When to Use ACE

**✅ Use ACE for:**
- Systems requiring continuous learning
- Complex tasks with evolving requirements
- Long-term context accumulation
- Production systems with feedback loops

**❌ Don't use ACE for:**
- Simple classification
- One-time optimizations
- Tasks without ongoing feedback

---

## AxRAG: Advanced Retrieval

### What is AxRAG?

AxRAG is a production-ready Retrieval-Augmented Generation implementation built on AxFlow with:

- **Multi-hop retrieval**: Iterative context gathering
- **Self-healing quality loops**: Automatic answer improvement
- **Intelligent query refinement**: AI-powered search optimization
- **Parallel processing**: Decompose and conquer complex questions

### Four-Phase Architecture

#### Phase 1: Multi-Hop Context Retrieval

```typescript
// Iteratively gathers comprehensive context
// Each hop refines the search based on what was found
```

#### Phase 2: Parallel Sub-Query Processing

```typescript
// Decomposes complex questions into focused sub-queries
// Executes searches in parallel
// Synthesizes evidence from multiple sources
```

#### Phase 3: Answer Generation

```typescript
// Produces comprehensive response using all accumulated context
```

#### Phase 4: Self-Healing Quality Loops

```typescript
// Validates answer quality
// Identifies deficiencies
// Retrieves targeted healing context
// Iteratively improves until quality threshold met
```

### Basic AxRAG Usage

```typescript
import { AxRAG } from "@ax-llm/ax";

// Define your query function
const queryFn = async (query: string): Promise<string[]> => {
  // Connect to your vector database
  const results = await vectorDB.search({
    query,
    limit: 5
  });

  return results.map(r => r.content);
};

// Create AxRAG instance
const rag = new AxRAG({
  queryFn,
  llm: ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! }),
  maxHops: 3,              // Multi-hop iterations
  qualityThreshold: 0.85,  // Minimum quality score
  enableHealing: true,     // Self-healing loops
  debug: true,             // Verbose logging
});

// Query
const result = await rag.query({
  question: "How does photosynthesis work in C4 plants?",
  context: "Focus on the Calvin cycle"
});

console.log(result.answer);
console.log(result.quality);      // Quality score
console.log(result.sources);      // Retrieved documents
console.log(result.hops);         // Number of retrieval rounds
console.log(result.healingLoops); // Number of improvement iterations
```

### Configuration Presets

#### Speed-Optimized

```typescript
const rag = new AxRAG({
  queryFn,
  llm,
  maxHops: 2,
  qualityThreshold: 0.7,
  enableHealing: false,
});
```

#### Quality-Focused

```typescript
const rag = new AxRAG({
  queryFn,
  llm,
  maxHops: 5,
  qualityThreshold: 0.95,
  enableHealing: true,
  maxHealingLoops: 3,
});
```

#### Balanced

```typescript
const rag = new AxRAG({
  queryFn,
  llm,
  maxHops: 3,
  qualityThreshold: 0.85,
  enableHealing: true,
  maxHealingLoops: 2,
});
```

### Vector Database Integration

#### Weaviate Example

```typescript
import weaviate from 'weaviate-ts-client';

const client = weaviate.client({
  scheme: 'http',
  host: 'localhost:8080',
});

const queryFn = async (query: string) => {
  const response = await client.graphql
    .get()
    .withClassName('Document')
    .withFields('content')
    .withNearText({ concepts: [query] })
    .withLimit(5)
    .do();

  return response.data.Get.Document.map((d: any) => d.content);
};
```

#### Pinecone Example

```typescript
import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const index = pinecone.index('my-index');

const queryFn = async (query: string) => {
  // Generate embedding for query
  const embedding = await llm.embed({ texts: [query] });

  // Search Pinecone
  const results = await index.query({
    vector: embedding.embeddings[0],
    topK: 5,
    includeMetadata: true,
  });

  return results.matches.map(m => m.metadata.content);
};
```

### Advanced Features

#### Gap Analysis

```typescript
const result = await rag.query({ question });

console.log(result.gaps); // Identified information gaps
// ["Missing details about enzyme specifics", "No mention of light conditions"]
```

#### Multi-Hop Trace

```typescript
console.log(result.retrievalTrace);
// [
//   { hop: 1, query: "photosynthesis C4 plants", docs: 5 },
//   { hop: 2, query: "C4 carbon fixation PEP carboxylase", docs: 3 },
//   { hop: 3, query: "Kranz anatomy bundle sheath cells", docs: 4 }
// ]
```

#### Custom Quality Assessment

```typescript
const rag = new AxRAG({
  queryFn,
  llm,
  qualityAssessmentFn: async (answer: string, question: string) => {
    // Custom quality logic
    const hasNumbers = /\d+/.test(answer);
    const hasCitations = answer.includes('[');
    const length = answer.split(' ').length;

    let score = 0.5;
    if (hasNumbers) score += 0.2;
    if (hasCitations) score += 0.2;
    if (length > 100) score += 0.1;

    return score;
  }
});
```

---

## Agents and Multi-Agent Systems

### AxAgent: Building Intelligent Agents

Agents in Ax are autonomous programs that can:
- Route tasks to specialized sub-agents
- Call functions and tools
- Maintain conversation context
- Collaborate with other agents

### Basic Agent

```typescript
import { AxAgent, ai } from "@ax-llm/ax";

const agent = new AxAgent({
  name: "Customer Support Agent",
  description: "Handles customer inquiries and support tickets",
  signature: 'customerMessage:string -> response:string, nextAction:class "escalate, resolve, gather-info"',
});

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const result = await agent.forward(llm, {
  customerMessage: "I need help with my order #12345"
});

console.log(result.response);
console.log(result.nextAction);
```

### Multi-Agent Collaboration

```typescript
import { AxAgent, AxAI, AxAIOpenAIModel } from "@ax-llm/ax";

// Define specialized agents
const researcher = new AxAgent({
  name: "Physics Researcher",
  description: "Expert in physics questions",
  signature: 'question:string -> answer:string',
  definition: "You are a physics expert. Provide detailed, accurate explanations."
});

const summarizer = new AxAgent({
  name: "Science Summarizer",
  description: "Summarizes complex science topics",
  signature: 'answer:string -> shortSummary:string',
  definition: "Create concise summaries in 10-20 words using numbered points."
});

// Coordinator agent
const coordinator = new AxAgent({
  name: "Science Expert",
  description: "Coordinates research and summarization",
  signature: 'question:string -> answer:string',
  agents: [researcher, summarizer], // Sub-agents
});

// Configure AI with model routing
const ai = new AxAI({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  models: [
    {
      key: "fast",
      model: AxAIOpenAIModel.GPT4OMini,
      description: "Fast model for simple tasks"
    },
    {
      key: "smart",
      model: AxAIOpenAIModel.GPT4O,
      description: "Smart model for complex reasoning"
    },
  ],
});

// Execute
const result = await coordinator.forward(ai, {
  question: "Why is gravity not a real force?"
});

console.log(result.answer);
// The coordinator will route to researcher, then to summarizer
```

### Agents with Function Calling

```typescript
const weatherTool = {
  name: 'getWeather',
  description: 'Get current weather',
  parameters: {
    type: 'object' as const,
    properties: {
      city: { type: 'string' }
    },
    required: ['city']
  },
  func: async ({ city }: { city: string }) => {
    // API call
    return `Weather in ${city}: Sunny, 75°F`;
  }
};

const searchTool = {
  name: 'searchWeb',
  description: 'Search the web',
  parameters: {
    type: 'object' as const,
    properties: {
      query: { type: 'string' }
    },
    required: ['query']
  },
  func: async ({ query }: { query: string }) => {
    // API call
    return `Search results for: ${query}`;
  }
};

const agent = new AxAgent({
  name: "Assistant",
  signature: 'userRequest:string -> response:string',
  functions: [weatherTool, searchTool],
});

const result = await agent.forward(llm, {
  userRequest: "What's the weather in Paris and find me news about the Eiffel Tower"
});
// Agent will call both tools and synthesize response
```

### Stateful Agents with Memory

```typescript
class ConversationalAgent {
  private history: Array<{ role: string; content: string }> = [];
  private agent: AxAgent;

  constructor() {
    this.agent = new AxAgent({
      name: "Conversational Assistant",
      signature: 'userMessage:string, conversationHistory:string -> response:string',
    });
  }

  async chat(message: string, llm: any) {
    // Add user message to history
    this.history.push({ role: 'user', content: message });

    // Create history context
    const historyStr = this.history
      .map(h => `${h.role}: ${h.content}`)
      .join('\n');

    // Get response
    const result = await this.agent.forward(llm, {
      userMessage: message,
      conversationHistory: historyStr
    });

    // Add assistant response to history
    this.history.push({ role: 'assistant', content: result.response });

    return result.response;
  }
}

// Usage
const chatAgent = new ConversationalAgent();
await chatAgent.chat("Hi, my name is Alice", llm);
await chatAgent.chat("What's my name?", llm); // "Your name is Alice"
```

---

## Observability and Telemetry

### Why Observability Matters

Production AI systems need:
- **Performance monitoring**: Track latency and throughput
- **Cost tracking**: Monitor token usage and API costs
- **Error detection**: Identify and debug failures
- **Quality metrics**: Measure output quality over time

Ax provides "X-ray vision for your AI applications" through OpenTelemetry.

### Automatic Tracking

Ax automatically tracks:
- ✅ LLM request/response cycles
- ✅ Token consumption and costs
- ✅ Function call execution
- ✅ Validation and assertion checks
- ✅ Vector database operations
- ✅ Multi-step workflow traces

### Quick Setup (Development)

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Setup tracing
const provider = new NodeTracerProvider();
provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
provider.register();

// Your Ax code runs as normal - telemetry is automatic
const result = await gen.forward(llm, values);
```

### Production Setup (OTLP)

```typescript
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const provider = new NodeTracerProvider({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'my-ai-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
  }),
});

const exporter = new OTLPTraceExporter({
  url: 'http://localhost:4318/v1/traces', // Your OTLP endpoint
});

provider.addSpanProcessor(new BatchSpanProcessor(exporter, {
  maxQueueSize: 1000,
  scheduledDelayMillis: 5000,
}));

provider.register();
```

### Metrics Tracked

#### LLM Service Metrics

- Request volumes
- Latency distribution (p50, p95, p99)
- Error rates
- Token consumption (input/output)
- Estimated costs
- Context window utilization

#### AxGen Metrics

- Generation workflows
- Multi-step processing
- Validation errors
- Function integration performance

#### Optimizer Metrics

- Optimization convergence
- Resource consumption
- Teacher-student interactions
- Pareto frontier analysis

#### Database Metrics

- Query latency
- Upsert performance
- Vector dimensions

### Custom Tracing

Add business context to traces:

```typescript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-app');

const span = tracer.startSpan('custom-operation');
span.setAttribute('user.id', userId);
span.setAttribute('operation.type', 'classification');

try {
  const result = await gen.forward(llm, values);
  span.setAttribute('result.category', result.category);
  span.setStatus({ code: 0 }); // Success
  return result;
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: 2, message: error.message }); // Error
  throw error;
} finally {
  span.end();
}
```

### Exclude Sensitive Content

```typescript
const llm = ai({
  name: "openai",
  apiKey: process.env.OPENAI_APIKEY!,
  options: {
    excludeContentFromTrace: true // Don't log request/response content
  }
});
```

### Integration Examples

#### Jaeger

```typescript
const exporter = new OTLPTraceExporter({
  url: 'http://jaeger:4318/v1/traces',
});
```

#### Prometheus

```typescript
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { MeterProvider } from '@opentelemetry/sdk-metrics';

const meterProvider = new MeterProvider({
  exporter: new PrometheusExporter({ port: 9464 }),
  interval: 1000,
});
```

#### AWS X-Ray

```typescript
import { AWSXRayPropagator } from '@opentelemetry/propagator-aws-xray';
import { AWSXRayIdGenerator } from '@opentelemetry/id-generator-aws-xray';

const provider = new NodeTracerProvider({
  idGenerator: new AWSXRayIdGenerator(),
});

provider.register({
  propagator: new AWSXRayPropagator(),
});
```

---

## Best Practices

### 1. Signature Design

**✅ Do:**
- Use descriptive field names (`customerEmail` not `text`)
- Enumerate class values explicitly
- Use optional fields for conditional data
- Include internal fields for reasoning

**❌ Don't:**
- Use generic names (`data`, `input`, `output`)
- Leave class types open-ended
- Make everything required
- Skip thinking/reasoning fields

### 2. Few-Shot Examples

**Quality over Quantity:**
- 5-10 diverse examples > 100 similar ones
- Cover edge cases and variations
- Include challenging scenarios
- Ensure examples are correct

### 3. Assertions

**Use liberally:**
```typescript
gen.setAssertions([
  {
    fn: ({ email }) => email.includes('@'),
    message: "Invalid email format"
  },
  {
    fn: ({ summary }) => summary.split(' ').length <= 50,
    message: "Summary too long"
  }
]);
```

### 4. Optimization

**When to optimize:**
- After initial prototyping
- For production deployments
- When performance matters
- With 10+ training examples

**When to skip:**
- Early exploration
- Creative tasks
- Insufficient training data
- One-off scripts

### 5. Provider Selection

**Choose based on needs:**

| Provider | Best For |
|----------|----------|
| OpenAI GPT-4 | Complex reasoning, high quality |
| OpenAI GPT-4-mini | Production balance of speed/cost |
| Claude Opus | Long context, nuanced understanding |
| Claude Sonnet | Fast, cost-effective |
| Gemini Pro | Multi-modal, long context |
| Ollama (local) | Privacy, offline, development |

### 6. Error Handling

```typescript
try {
  const result = await gen.forward(llm, values);
  return result;
} catch (error) {
  if (error.name === 'ValidationError') {
    // Handle validation failures
  } else if (error.name === 'APIError') {
    // Handle API issues
  } else {
    // General error handling
  }
}
```

### 7. Cost Management

**Reduce costs:**
- Use cheaper models (gpt-4o-mini vs gpt-4o)
- Optimize with MiPRO (50-80% reduction)
- Limit maxTokens appropriately
- Cache embeddings when possible
- Use streaming to show progress early

### 8. Type Safety

**Leverage TypeScript:**
```typescript
interface CustomerTicket {
  email: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

const gen = new AxGen<{ email: string }, CustomerTicket>({
  signature: 'email:string -> priority:class "high, medium, low", category:string'
});

// TypeScript ensures type safety
const result: CustomerTicket = await gen.forward(llm, { email });
```

### 9. Streaming for UX

```typescript
const stream = await gen.streamingForward(llm, values);

for await (const chunk of stream) {
  // Update UI incrementally
  updateUI(chunk);
}
```

### 10. Testing

```typescript
import { describe, it, expect } from 'vitest';

describe('Sentiment Classifier', () => {
  it('classifies positive reviews correctly', async () => {
    const result = await classifier.forward(llm, {
      review: "Excellent product!"
    });

    expect(result.sentiment).toBe('positive');
    expect(result.confidence).toBeGreaterThan(0.8);
  });
});
```

---

## Examples and Use Cases

### Example 1: Email Classification

```typescript
import { ax, ai } from "@ax-llm/ax";

const classifier = ax(`
  emailSubject:string, emailBody:string ->
  category:class "sales, support, billing, spam",
  priority:class "urgent, high, normal, low",
  suggestedDepartment:string,
  requiresHumanReview:boolean
`);

const llm = ai({ name: "openai", apiKey: process.env.OPENAI_APIKEY! });

const result = await classifier.forward(llm, {
  emailSubject: "URGENT: System down!",
  emailBody: "Our production system has been down for 2 hours..."
});

console.log(result);
// {
//   category: "support",
//   priority: "urgent",
//   suggestedDepartment: "DevOps",
//   requiresHumanReview: true
// }
```

### Example 2: Customer Support Agent

```typescript
const supportFlow = new AxFlow()
  .n("classify", ax('message:string -> intent:class "question, complaint, request, feedback"'))
  .n("analyze", ax('message:string, intent:string -> sentiment:class "positive, negative, neutral", urgency:number'))
  .branch()
    .when(({ analyzeResult }) => analyzeResult.urgency > 0.8)
      .n("escalate", ax('message:string -> escalationNote:string, suggestedAgent:string'))
    .when(({ analyzeResult }) => analyzeResult.urgency <= 0.8)
      .n("respond", ax('message:string, intent:string, sentiment:string -> response:string'))
  .merge()
  .returns<{ response?: string, escalationNote?: string }>();

const result = await supportFlow.run(llm, {
  message: "This is the third time I'm asking about my refund!"
});
```

### Example 3: Document Analysis Pipeline

```typescript
const documentAnalysis = new AxFlow()
  .n("extract", ax('document:string -> entities:string[], dates:datetime[], amounts:number[]'))
  // These run in parallel (no dependencies)
  .n("sentiment", ax('document:string -> sentiment:class "positive, negative, neutral", confidence:number'))
  .n("keywords", ax('document:string -> keywords:string[]'))
  .n("summary", ax('document:string -> summary:string'))
  // This waits for all above to complete
  .n("report", ax(`
    entities:string[],
    dates:datetime[],
    amounts:number[],
    sentiment:string,
    keywords:string[],
    summary:string
    ->
    fullReport:string,
    confidence:number
  `))
  .returns<{ fullReport: string, confidence: number }>();

const result = await documentAnalysis.run(llm, { document: longText });
```

### Example 4: Recipe Generator with Validation

```typescript
const recipeGen = ax(`
  ingredients:string[],
  dietaryRestrictions:string[],
  cuisine:string
  ->
  recipeName:string,
  instructions:string[],
  cookingTime:number,
  servings:number,
  nutritionInfo:json
`);

recipeGen.setAssertions([
  {
    fn: ({ instructions }) => instructions.length >= 3,
    message: "Recipe must have at least 3 steps"
  },
  {
    fn: ({ cookingTime }) => cookingTime > 0 && cookingTime < 480,
    message: "Cooking time must be between 1 and 480 minutes"
  },
  {
    fn: ({ servings }) => servings >= 1 && servings <= 12,
    message: "Servings must be between 1 and 12"
  }
]);

const recipe = await recipeGen.forward(llm, {
  ingredients: ["chicken", "tomatoes", "garlic", "olive oil"],
  dietaryRestrictions: ["gluten-free"],
  cuisine: "Italian"
});
```

### Example 5: Multi-Modal Product Analysis

```typescript
import fs from 'fs';

const productAnalyzer = ax(`
  productImage:image,
  productDescription:string
  ->
  category:class "electronics, clothing, home, food, other",
  colors:string[],
  estimatedPrice:string,
  targetAudience:class "children, teens, adults, seniors, all-ages",
  marketingKeywords:string[],
  competitorProducts:string[]
`);

const imageBuffer = fs.readFileSync('./product.jpg');

const analysis = await productAnalyzer.forward(llm, {
  productImage: imageBuffer,
  productDescription: "Wireless Bluetooth headphones with noise cancellation"
});

console.log(analysis);
```

### Example 6: Research Assistant with RAG

```typescript
const researchAssistant = new AxRAG({
  queryFn: async (query) => {
    // Search academic database
    const papers = await searchDatabase(query);
    return papers.map(p => p.abstract);
  },
  llm,
  maxHops: 4,
  qualityThreshold: 0.9,
  enableHealing: true,
});

const answer = await researchAssistant.query({
  question: "What are the latest developments in quantum error correction?",
  context: "Focus on surface codes and topological methods"
});

console.log(answer.answer);
console.log(`Sources: ${answer.sources.length}`);
console.log(`Quality: ${answer.quality}`);
console.log(`Retrieval rounds: ${answer.hops}`);
```

### Example 7: Optimized Classifier

```typescript
import { AxMiPRO, ax, ai } from "@ax-llm/ax";

// 1. Create base program
const classifier = ax('review:string -> sentiment:class "positive, negative, neutral"');

// 2. Prepare training data
const examples = [
  { review: "Amazing product!", sentiment: "positive" },
  { review: "Complete waste of money", sentiment: "negative" },
  { review: "It's fine, nothing special", sentiment: "neutral" },
  // ... 10-20 more diverse examples
];

// 3. Optimize
const optimizer = new AxMiPRO({
  trainExamples: examples,
  testExamples: examples.slice(0, 5),
  metric: (pred, ex) => pred.sentiment === ex.sentiment ? 1 : 0,
});

const student = ai({ name: "openai", config: { model: "gpt-4o-mini" } });
const teacher = ai({ name: "openai", config: { model: "gpt-4o" } });

const optimized = await optimizer.compile({
  program: classifier,
  student,
  teacher,
  maxRounds: 10,
});

// 4. Use in production
const result = await optimized.forward(student, {
  review: "Pretty good, would buy again"
});

// 5. Save for later
fs.writeFileSync('model.json', JSON.stringify(optimized.toJSON()));
```

---

## Additional Resources

### Official Links

- **GitHub Repository**: https://github.com/ax-llm/ax
- **Documentation**: Available in `docs/` directory
- **Discord Community**: Active support channel
- **Twitter**: Updates and announcements

### Example Categories

The repository includes 70+ examples in `src/examples/`:

1. **Getting Started**: Basic patterns and setup
2. **Core Concepts**: Function calling, streaming, few-shot
3. **Advanced Features**: Multi-modal, chain-of-thought
4. **Production Patterns**: Customer support, search systems
5. **Optimization**: MiPRO, GEPA, ACE training
6. **Agent Systems**: Multi-agent, collaboration
7. **Workflow Orchestration**: AxFlow pipelines
8. **RAG Systems**: Advanced retrieval patterns

### Running Examples

```bash
# Clone repository
git clone https://github.com/ax-llm/ax.git
cd ax

# Install
npm install

# Set API key
export OPENAI_APIKEY=your-key

# Run example
npm run tsx ./src/examples/extract.ts
```

### Community Support

- **Discord**: Real-time community help
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: Architecture and design questions

---

## Conclusion

Ax transforms AI application development by:

1. **Eliminating manual prompt engineering** through declarative signatures
2. **Providing type safety** with full TypeScript support
3. **Enabling provider flexibility** with 15+ LLM integrations
4. **Automating optimization** for better performance and lower costs
5. **Offering production-grade features** like streaming, validation, and observability

Whether you're building a simple classifier or a complex multi-agent RAG system, Ax provides the tools and patterns to ship reliable AI features quickly.

**Get Started:**
```bash
npm install @ax-llm/ax
```

**Next Steps:**
1. Try the quick start example
2. Explore the 70+ examples
3. Build your first signature
4. Optimize with MiPRO
5. Deploy to production with telemetry

**Happy building!** 🚀
