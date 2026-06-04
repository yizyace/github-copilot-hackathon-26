import type { Lens, Manifest } from '../../lib/soulStack/types'
import { Fieldset, NumberField, TextAreaField, TextField, Toggle } from './fields'

export function ManifestForm({ value, onChange }: { value: Manifest; onChange: (m: Manifest) => void }) {
  const set = (patch: Partial<Manifest>) => onChange({ ...value, ...patch })
  const setPersona = (patch: Partial<Manifest['persona']>) =>
    set({ persona: { ...value.persona, ...patch } })
  const setModels = (patch: Partial<Manifest['models']>) =>
    set({ models: { ...value.models, ...patch } })
  const setRetrieval = (patch: Partial<Manifest['retrieval']>) =>
    set({ retrieval: { ...value.retrieval, ...patch } })
  const setFeatures = (patch: Partial<Manifest['features']>) =>
    set({ features: { ...value.features, ...patch } })
  const setLens = (i: number, patch: Partial<Lens>) =>
    set({ lenses: value.lenses.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  const addLens = () =>
    set({
      lenses: [
        ...value.lenses,
        { id: `lens-${value.lenses.length + 1}`, title: 'New lens', enabled: true, rolePrompt: '' },
      ],
    })
  const removeLens = (i: number) => set({ lenses: value.lenses.filter((_, j) => j !== i) })

  return (
    <div className="sr-ed-file">
      <h2 className="sr-ed-file__title">manifest.yaml</h2>
      <TextField label="Name (kebab id)" value={value.name} mono onChange={(v) => set({ name: v })} />

      <Fieldset legend="Persona">
        <TextField
          label="Display name"
          value={value.persona.displayName}
          onChange={(v) => setPersona({ displayName: v })}
        />
        <TextField
          label="Avatar (emoji)"
          value={value.persona.avatar}
          onChange={(v) => setPersona({ avatar: v })}
        />
        <TextAreaField
          label="Tagline"
          value={value.persona.tagline}
          rows={2}
          onChange={(v) => setPersona({ tagline: v })}
        />
      </Fieldset>

      <Fieldset legend="Models">
        <TextField
          label="Review model"
          value={value.models.review}
          mono
          onChange={(v) => setModels({ review: v })}
        />
        <TextField
          label="Embedding model"
          value={value.models.embedding}
          mono
          onChange={(v) => setModels({ embedding: v })}
        />
      </Fieldset>

      <Fieldset legend="Lenses">
        {value.lenses.map((l, i) => (
          <div className="sr-lens-row" key={i}>
            <Toggle label={l.enabled ? 'on' : 'off'} checked={l.enabled} onChange={(v) => setLens(i, { enabled: v })} />
            <TextField label="id" value={l.id} mono onChange={(v) => setLens(i, { id: v })} />
            <TextField label="title" value={l.title} onChange={(v) => setLens(i, { title: v })} />
            <TextAreaField
              label="role prompt"
              value={l.rolePrompt}
              rows={2}
              onChange={(v) => setLens(i, { rolePrompt: v })}
            />
            <button type="button" className="sr-mini-btn" onClick={() => removeLens(i)}>
              Remove lens
            </button>
          </div>
        ))}
        <button type="button" className="sr-mini-btn" onClick={addLens}>
          + Add lens
        </button>
      </Fieldset>

      <Fieldset legend="Retrieval">
        <NumberField label="top_k" value={value.retrieval.topK} onChange={(v) => setRetrieval({ topK: v })} />
        <NumberField
          label="max_journal_context"
          value={value.retrieval.maxJournalContext}
          onChange={(v) => setRetrieval({ maxJournalContext: v })}
        />
        <NumberField
          label="full_body_threshold"
          step={0.01}
          value={value.retrieval.fullBodyThreshold}
          onChange={(v) => setRetrieval({ fullBodyThreshold: v })}
        />
        <Toggle
          label="exclude low-confidence memories"
          checked={value.retrieval.excludeLowConfidence}
          onChange={(v) => setRetrieval({ excludeLowConfidence: v })}
        />
      </Fieldset>

      <Fieldset legend="Features">
        <Toggle
          label="write-back (propose memories after review)"
          checked={value.features.writeBack}
          onChange={(v) => setFeatures({ writeBack: v })}
        />
        <Toggle
          label="see_also expansion"
          checked={value.features.seeAlsoExpansion}
          onChange={(v) => setFeatures({ seeAlsoExpansion: v })}
        />
        <Toggle
          label="fail the check on a blocking finding"
          checked={value.features.failOnBlocking}
          onChange={(v) => setFeatures({ failOnBlocking: v })}
        />
      </Fieldset>
    </div>
  )
}
