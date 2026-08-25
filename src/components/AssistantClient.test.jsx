import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TextEncoder, TextDecoder } from 'util';
import AssistantClient from './AssistantClient';

// jsdom does not provide these Web APIs
if (!global.TextEncoder) global.TextEncoder = TextEncoder;
if (!global.TextDecoder) global.TextDecoder = TextDecoder;
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = jest.fn();
}
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = jest.fn();
}

function mockStreamResponse(chunks) {
  const encoder = new TextEncoder();
  const encoded = chunks.map((c) => encoder.encode(c));
  let i = 0;
  return {
    ok: true,
    body: {
      getReader: () => ({
        read: () =>
          i < encoded.length
            ? Promise.resolve({ done: false, value: encoded[i++] })
            : Promise.resolve({ done: true }),
      }),
    },
  };
}

describe('AssistantClient', () => {
  let originalFetch;

  beforeEach(() => {
    jest.clearAllMocks();
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('Render', () => {
    it('renders the empty state with suggestion cards', () => {
      render(<AssistantClient />);
      expect(screen.getByText(/Your inventory assistant/i)).toBeInTheDocument();
      expect(screen.getByText('What can I cook?')).toBeInTheDocument();
      expect(screen.getByText('What should I buy?')).toBeInTheDocument();
      expect(screen.getByText('Running low')).toBeInTheDocument();
    });

    it('shows the chat header with a bot avatar', () => {
      render(<AssistantClient />);
      expect(screen.getByText('Assistant')).toBeInTheDocument();
    });
  });

  describe('Sending a question', () => {
    it('shows the user bubble and streams the assistant reply', async () => {
      const user = userEvent.setup();
      const fetchMock = jest.fn().mockResolvedValue(mockStreamResponse(['Hello ', 'chef']));
      global.fetch = fetchMock;

      render(<AssistantClient />);
      const input = screen.getByLabelText(/ask the ai assistant/i);
      await user.type(input, 'What can I cook?{enter}');

      await waitFor(() => {
        expect(screen.getByText('Hello chef')).toBeInTheDocument();
      });

      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [, options] = fetchMock.mock.calls[0];
      expect(options.method).toBe('POST');
      const payload = JSON.parse(options.body);
      expect(payload.messages).toEqual([
        { role: 'user', content: 'What can I cook?' },
      ]);
    });

    it('sends full conversation history for follow-up questions', async () => {
      const user = userEvent.setup();
      let callCount = 0;
      global.fetch = jest.fn().mockImplementation(() => {
        callCount += 1;
        return Promise.resolve(mockStreamResponse([`answer ${callCount}`]));
      });

      render(<AssistantClient />);
      await user.type(screen.getByLabelText(/ask the ai assistant/i), 'First question{enter}');
      await waitFor(() => expect(screen.getByText('answer 1')).toBeInTheDocument());

      await user.type(screen.getByLabelText(/ask the ai assistant/i), 'Second question{enter}');
      await waitFor(() => expect(screen.getByText('answer 2')).toBeInTheDocument());

      const [, options] = global.fetch.mock.calls[1];
      const payload = JSON.parse(options.body);
      expect(payload.messages).toHaveLength(3);
      expect(payload.messages[0]).toEqual({ role: 'user', content: 'First question' });
      expect(payload.messages[1]).toEqual({ role: 'assistant', content: 'answer 1' });
      expect(payload.messages[2]).toEqual({ role: 'user', content: 'Second question' });
    });

    it('sends the prompt when clicking a suggestion card', async () => {
      const user = userEvent.setup();
      const fetchMock = jest.fn().mockResolvedValue(mockStreamResponse(['Pasta!']));
      global.fetch = fetchMock;

      render(<AssistantClient />);
      await user.click(screen.getByText('What can I cook?'));

      await waitFor(() => expect(screen.getByText('Pasta!')).toBeInTheDocument());
      const [, options] = fetchMock.mock.calls[0];
      const payload = JSON.parse(options.body);
      expect(payload.messages[0].content).toMatch(/cook/i);
    });

    it('does not send on Shift+Enter', async () => {
      const fetchMock = jest.fn().mockResolvedValue(mockStreamResponse(['ok']));
      global.fetch = fetchMock;

      render(<AssistantClient />);
      const input = screen.getByLabelText(/ask the ai assistant/i);

      fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });

      expect(fetchMock).not.toHaveBeenCalled();
    });

    it('clears the input after sending', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn().mockResolvedValue(mockStreamResponse(['ok']));
      render(<AssistantClient />);

      const input = screen.getByLabelText(/ask the ai assistant/i);
      await user.type(input, 'Hello{enter}');
      await waitFor(() => expect(input).toHaveValue(''));
    });
  });

  describe('Error handling', () => {
    it('displays the server error message in an error bubble', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: 'The free AI quota is used up right now.' }),
      });

      render(<AssistantClient />);
      await user.type(screen.getByLabelText(/ask the ai assistant/i), 'Hi{enter}');

      const errorBubble = await screen.findByText(/quota is used up/i);
      expect(errorBubble.className).toMatch(/red/);
    });
  });

  describe('New chat', () => {
    it('resets the conversation back to the empty state', async () => {
      const user = userEvent.setup();
      global.fetch = jest.fn().mockResolvedValue(mockStreamResponse(['reply']));
      render(<AssistantClient />);

      await user.type(screen.getByLabelText(/ask the ai assistant/i), 'Hi{enter}');
      await waitFor(() => expect(screen.getByText('reply')).toBeInTheDocument());

      await user.click(screen.getByRole('button', { name: /start a new conversation/i }));

      expect(screen.getByText(/Your inventory assistant/i)).toBeInTheDocument();
      expect(screen.queryByText('reply')).not.toBeInTheDocument();
    });
  });
});
