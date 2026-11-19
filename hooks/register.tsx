import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

const busy = atom({ plugin: 'prompt-feld', key: 'busy' } as const, false)
const status = atom({ plugin: 'prompt-feld', key: 'status' } as const, '')

const SYSTEM = `Du bist ein Prompt-Optimierer. Der Nutzer gibt dir einen groben Entwurf für einen Prompt an eine KI.
Schreibe ihn zu EINEM klaren, vollständigen, sofort sendbaren Prompt um: Ziel, Kontext, gewünschtes Format und Umfang klar benennen.
Behalte die Sprache des Entwurfs bei. Erfinde keine Fakten. Führe die Aufgabe NICHT aus.
Antworte nur mit dem fertigen Prompt, ohne Einleitung, ohne Anführungszeichen, ohne Erklärung.`

async function optimize($: EngineInterface, draft: string) {
  const text = draft.trim()
  if (!text) {
    $.ui.toast('Bitte zuerst einen Entwurf eingeben.')
    return
  }
  if (await read($, busy)) return
  await update($, busy, () => true)
  await update($, status, () => 'Optimiere …')
  try {
    const r = await $.model.complete({ model: 'sonnet', system: SYSTEM, prompt: text, maxTokens: 2000 })
    if (r.isAnswered && r.text.trim()) {
      await $.prompt.fill({ text: r.text.trim(), mode: 'replace' })
      await update($, status, () => 'Fertig – steht jetzt im Chatfeld. Prüfen und abschicken.')
    } else {
      await update($, status, () => 'Hat nicht geklappt, bitte nochmal versuchen.')
    }
  } finally {
    await update($, busy, () => false)
  }
}


const PANE = 'prompt-feld'

async function drawField($: EngineInterface, e: Parameters<EngineInterface['ui']['resolve']>[0]) {
  const { Box, Text, Input, Button } = $.ui.resolve(e)
  const isBusy = await read($, busy)
  const msg = await read($, status)

  return (
    <Box flexDirection="column">
      <Input
        key="entwurf"
        label="✨ Prompt-Optimierer: "
        placeholder="Groben Entwurf tippen, Enter = optimieren"
        submitLabel="optimieren"
        rows={2}
        onSubmit={(value: string) => { void optimize($, value) }}
      />
      <Box>
        <Button
          key="chatfeld"
          label={isBusy ? 'Optimiere …' : 'Text im Chatfeld optimieren'}
          onPress={async () => { const box = await $.prompt.read(); await optimize($, box.text) }}
        />
        {msg ? <Text dimColor> {msg}</Text> : null}
      </Box>
    </Box>
  )
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.ui.toast('Prompt-Feld ist geladen ✨')
    void $.ui.open({ id: PANE, title: 'Prompt-Optimierer', placement: 'widget' })
    return next(e)
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey) return next(e)
    return drawField($, e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => drawField($, e))
}
