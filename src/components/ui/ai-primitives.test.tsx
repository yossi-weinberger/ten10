import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Attachment, AttachmentContent, AttachmentTitle } from "./attachment";
import { Bubble, BubbleContent } from "./bubble";
import { Empty, EmptyTitle } from "./empty";
import { InputGroup, InputGroupTextarea } from "./input-group";
import { Message, MessageContent } from "./message";
import { Spinner } from "./spinner";

describe("AI primitives", () => {
  it("render their slots", () => {
    const markup = renderToStaticMarkup(
      <Message align="end">
        <MessageContent>
          <Bubble align="end" variant="muted">
            <BubbleContent>hi</BubbleContent>
          </Bubble>
          <Attachment size="sm"><AttachmentContent><AttachmentTitle>r.jpg</AttachmentTitle></AttachmentContent></Attachment>
          <InputGroup><InputGroupTextarea aria-label="m" /></InputGroup>
          <Empty><EmptyTitle>t</EmptyTitle></Empty>
          <Spinner />
        </MessageContent>
      </Message>,
    );
    for (const slot of ["message", "bubble-content", "attachment", "input-group", "empty"]) {
      expect(markup).toContain(`data-slot="${slot}"`);
    }
  });
});
