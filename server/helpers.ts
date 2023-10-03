import { loadSummarizationChain } from "langchain/chains";
import { OpenAI } from "langchain/llms/openai";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";

export async function summarize(text: string): Promise<string> {
  const model = new OpenAI({ temperature: 0 });
  const textSplitter = new RecursiveCharacterTextSplitter({ chunkSize: 1000 });
  const docs = await textSplitter.createDocuments([text]);

  const chain = loadSummarizationChain(model, { type: "map_reduce" });
  const res = await chain.run({
    input_documents: docs,
  });
  return res;
}