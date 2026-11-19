import { expect, test } from 'claude-code/testing'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`band draws the field on ${surface}`, async ($, on) => {
    const filled: string[] = []
    on('prompt.fill', (_, e) => {
      filled.push(e.text)
      return { isFilled: true, text: e.text, cursor: e.text.length }
    })
    on('model.complete', () => ({ value: { isAnswered: true, text: 'BESSER', usage: { input_tokens: 1, output_tokens: 1 } } }) as never)
    const ui = await $.ui.mount({
      plugin: 'prompt-feld',
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isCollapsed: false, isWorking: false } as never,
    })
    expect(await ui.find({ key: 'entwurf' })).toBeDefined()
    await ui.input({ key: 'entwurf', text: 'mail an chef wegen urlaub' })
    expect(filled).toEqual(['BESSER'])
    await ui.unmount()
  })
}
