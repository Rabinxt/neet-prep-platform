import { loadAndValidateContent } from "./load-content";

const { bundle, errors } = loadAndValidateContent();

if (errors.length > 0) {
  console.error(`Content validation failed with ${errors.length} error(s):`);
  for (const error of errors) {
    console.error(`- ${error.file} [${error.identifier}]: ${error.reason}`);
  }
  process.exitCode = 1;
} else {
  console.info(
    `Content is valid: ${bundle.subjects.length} subjects, ${bundle.chapters.length} chapters, ${bundle.topics.length} topics, ${bundle.questions.length} questions.`,
  );
}
