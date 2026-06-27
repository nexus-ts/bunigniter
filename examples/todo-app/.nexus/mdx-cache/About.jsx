import { jsx, jsxs, Fragment } from 'react/jsx-runtime';
/*@jsxRuntime automatic*/
/*@jsxImportSource react*/
function _createMdxContent(props) {
  const _components = {
    a: "a",
    code: "code",
    h1: "h1",
    h2: "h2",
    li: "li",
    p: "p",
    pre: "pre",
    strong: "strong",
    ul: "ul",
    ...props.components
  };
  return <><_components.h1>{"📋 About Todo App"}</_components.h1>{"\n"}<_components.p>{"A full-stack Todo application built with "}<_components.strong>{"NexusTS"}</_components.strong>{" — a Bun-native framework inspired by CodeIgniter."}</_components.p>{"\n"}<_components.h2>{"Features"}</_components.h2>{"\n"}<_components.ul>{"\n"}<_components.li><_components.strong>{"SSR React Views"}</_components.strong>{" — Pages are React components rendered on the server"}</_components.li>{"\n"}<_components.li><_components.strong>{"SQLite Database"}</_components.strong>{" — Lightweight, zero-config persistence"}</_components.li>{"\n"}<_components.li><_components.strong>{"CRUD Operations"}</_components.strong>{" — Create, read, update, delete todos"}</_components.li>{"\n"}<_components.li><_components.strong>{"Filter & Search"}</_components.strong>{" — By status (active/completed), priority, or text"}</_components.li>{"\n"}<_components.li><_components.strong>{"Post/Redirect/Get"}</_components.strong>{" — HTML form submissions with PRG pattern"}</_components.li>{"\n"}</_components.ul>{"\n"}<_components.h2>{"Tech Stack"}</_components.h2>{"\n"}<_components.p>{"| Component | Technology |\n|-----------|-----------|\n| Runtime | "}<_components.a href="https://bun.sh">{"Bun"}</_components.a>{" 1.3+ |\n| Framework | NexusTS (CodeIgniter-style) |\n| HTTP | Elysia v2 |\n| View | React 19 (SSR) |\n| Database | SQLite via "}<_components.code>{"bun:sqlite"}</_components.code>{" |\n| Page format | "}<_components.strong>{"MDX"}</_components.strong>{" — Markdown + JSX |"}</_components.p>{"\n"}<_components.h2>{"Built With MDX"}</_components.h2>{"\n"}<_components.p>{"This page itself is written in "}<_components.strong>{"MDX"}</_components.strong>{" format — Markdown with embedded React components. Bun compiles it at runtime."}</_components.p>{"\n"}<_components.pre><_components.code className="language-mdx">{"# Title\nRegular Markdown here...\n\n<Button label=\"Click me\" />\n"}</_components.code></_components.pre>{"\n"}<_components.h2>{"Routes"}</_components.h2>{"\n"}<_components.p>{"| Method | Path | Description |\n|--------|------|-------------|\n| "}<_components.code>{"GET"}</_components.code>{" | "}<_components.code>{"/"}</_components.code>{" | Redirect to "}<_components.code>{"/todos"}</_components.code>{" |\n| "}<_components.code>{"GET"}</_components.code>{" | "}<_components.code>{"/todos"}</_components.code>{" | List all todos |\n| "}<_components.code>{"POST"}</_components.code>{" | "}<_components.code>{"/todos"}</_components.code>{" | Create a todo |\n| "}<_components.code>{"GET"}</_components.code>{" | "}<_components.code>{"/about"}</_components.code>{" | This page |"}</_components.p></>;
}
export default function MDXContent(props = {}) {
  const {wrapper: MDXLayout} = props.components || ({});
  return MDXLayout ? <MDXLayout {...props}><_createMdxContent {...props} /></MDXLayout> : _createMdxContent(props);
}
