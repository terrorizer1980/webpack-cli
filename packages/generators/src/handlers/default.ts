import path from "path";
import { CustomGenerator } from "../types";

const templatePath = path.resolve(__dirname, "../../init-template/default");
const resolveFile = (file: string): string => {
  return path.resolve(templatePath, file);
};

/**
 * Asks questions to the user used to modify generation
 * @param self Generator values
 * @param Question Contains questions
 */

export async function questions(
  self: CustomGenerator,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Question: Record<string, any>,
): Promise<void> {
  // Handle JS language solutions
  const { langType } = await Question.List(
    self,
    "langType",
    "Which of the following JS solutions do you want to use?",
    ["none", "ES6", "Typescript"],
    "none",
    self.force,
  );

  switch (langType) {
    case "ES6":
      self.dependencies.push("babel-loader", "@babel/core", "@babel/preset-env");
      break;
    case "Typescript":
      self.dependencies.push("typescript", "ts-loader");
      break;
  }

  // Configure devServer configuration
  const { devServer } = await Question.Confirm(
    self,
    "devServer",
    "Do you want to use webpack-dev-server?",
    true,
    self.force,
  );
  if (devServer) {
    self.dependencies.push("webpack-dev-server");
  }

  // Handle addition of html-webpack-plugin
  const { htmlWebpackPlugin } = await Question.Confirm(
    self,
    "htmlWebpackPlugin",
    "Do you want to simplify the creation of HTML files for your bundle?",
    true,
    self.force,
  );
  if (htmlWebpackPlugin) {
    self.dependencies.push("html-webpack-plugin");
  }

  // Handle addition of workbox-webpack-plugin
  const { workboxWebpackPlugin } = await Question.Confirm(
    self,
    "workboxWebpackPlugin",
    "Do you want to add PWA support?",
    true,
    self.force,
  );
  if (workboxWebpackPlugin) {
    self.dependencies.push("workbox-webpack-plugin");
  }

  // Store all answers for generation
  self.answers = {
    ...self.answers,
    langType,
    devServer,
    htmlWebpackPlugin,
    workboxWebpackPlugin,
  };

  // Handle CSS solutions
  const { cssType } = await Question.List(
    self,
    "cssType",
    "Which of the following CSS solutions do you want to use?",
    ["none", "CSS only", "SASS", "LESS", "Stylus"],
    "none",
    self.force,
  );

  if (cssType == "none") {
    self.answers = {
      ...self.answers,
      cssType,
      isCSS: false,
      isPostCSS: false,
      extractPlugin: "No",
    };
    return;
  }

  const { isCSS } =
    cssType != "CSS only"
      ? await Question.Confirm(
          self,
          "isCSS",
          `Will you be using CSS styles along with ${cssType} in your project?`,
          true,
          self.force,
        )
      : { isCSS: true };

  const { isPostCSS } = await Question.Confirm(
    self,
    "isPostCSS",
    "Will you be using PostCSS in your project?",
    cssType == "CSS only",
    self.force,
  );

  const { extractPlugin } = await Question.List(
    self,
    "extractPlugin",
    "Do you want to extract CSS for every file?",
    ["No", "Only for Production", "Yes"],
    "No",
    self.force,
  );

  switch (cssType) {
    case "SASS":
      self.dependencies.push("sass-loader", "sass");
      break;
    case "LESS":
      self.dependencies.push("less-loader", "less");
      break;
    case "Stylus":
      self.dependencies.push("stylus-loader", "stylus");
      break;
  }

  if (isCSS) {
    self.dependencies.push("style-loader", "css-loader");
  }

  if (isPostCSS) {
    self.dependencies.push("postcss-loader", "postcss", "autoprefixer");
  }

  if (extractPlugin !== "No") {
    self.dependencies.push("mini-css-extract-plugin");
  }

  self.answers = {
    ...self.answers,
    cssType,
    isCSS,
    isPostCSS,
    extractPlugin,
  };
}

/**
 * Handles generation of project files
 * @param self Generator values
 */
export function generate(self: CustomGenerator): void {
  self.fs.extendJSON(
    self.destinationPath("package.json"),
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require(resolveFile("package.json.js"))(self.answers.devServer),
  );

  // Generate entry file
  let entry = "./src/index.";
  if (self.answers.langType == "Typescript") {
    entry += "ts";
  } else {
    entry += "js";
  }
  self.fs.copyTpl(resolveFile("index.js"), self.destinationPath(entry));

  // Generate README
  self.fs.copyTpl(resolveFile("README.md"), self.destinationPath("README.md"), {});

  // Generate HTML file
  self.fs.copyTpl(
    resolveFile("template.html.tpl"),
    self.destinationPath("index.html"),
    self.answers,
  );

  // Generate webpack configuration
  self.fs.copyTpl(resolveFile("webpack.configjs.tpl"), self.destinationPath("webpack.config.js"), {
    ...self.answers,
    entry,
  });
  self.configurationPath = self.destinationPath("webpack.config.js");

  // Generate JS language essentials
  switch (self.answers.langType) {
    case "ES6":
      self.fs.copyTpl(resolveFile(".babelrc"), self.destinationPath(".babelrc"));
      break;
    case "Typescript":
      self.fs.copyTpl(resolveFile("tsconfig.json"), self.destinationPath("tsconfig.json"));
      break;
  }

  // Generate postcss configuration
  if (self.answers.isPostCSS) {
    self.fs.copyTpl(resolveFile("postcss.config.js"), self.destinationPath("postcss.config.js"));
  }
}
