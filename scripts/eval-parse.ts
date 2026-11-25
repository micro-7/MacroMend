// Run with: EVAL_PROVIDER=groq EVAL_API_KEY=... npm run eval:parse
import { runEvalFromEnv } from '../src/ai/evalRunner';

runEvalFromEnv(process.env).then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
