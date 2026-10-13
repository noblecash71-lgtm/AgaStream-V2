import { useState } from "react";
import { ImagePlus, Pencil, Plus, Save, Tags, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import type { AdminCategory, AdminInterpreter, CategoryEditorInput, InterpreterEditorInput } from "@/lib/catalogTypes";
import { trpc } from "@/lib/trpc";
import MediaUpload from "@/components/MediaUpload";

function CategoryEditor({ initial, saving, onCancel, onSave }: { initial: AdminCategory | null; saving: boolean; onCancel: () => void; onSave: (input: CategoryEditorInput) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ ...(initial ? { id: initial.id } : {}), name: name.trim(), description: description.trim() || null });
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <form className="player-dialog admin-editor taxonomy-editor" role="dialog" aria-modal="true" aria-labelledby="category-editor-heading" onSubmit={submit}>
      <div className="dialog-head"><div><span className="eyebrow">Catalog organization</span><h2 id="category-editor-heading" style={{ marginTop: 5 }}>{initial ? "Edit category" : "Add category"}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close category editor"><X size={17} /></button></div>
      <div className="taxonomy-form-body"><div className="form-field"><label htmlFor="category-name">Category name</label><input id="category-name" className="text-control" required maxLength={120} value={name} onChange={event => setName(event.target.value)} placeholder="e.g. Drama" /></div>
        <div className="form-field"><label htmlFor="category-description">Description</label><textarea id="category-description" className="textarea-control" maxLength={5000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Optional visitor-facing description" /></div>
        <p className="form-hint">Renaming updates the category label on every associated title. Removing a category also removes its label from those titles.</p>
        <div className="admin-form-actions"><button className="button-secondary" type="button" onClick={onCancel}>Cancel</button><button className="button-primary" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save category"}</button></div>
      </div>
    </form>
  </div>;
}

function InterpreterEditor({ initial, saving, onCancel, onSave }: { initial: AdminInterpreter | null; saving: boolean; onCancel: () => void; onSave: (input: InterpreterEditorInput) => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [photoUrl, setPhotoUrl] = useState(initial?.photoUrl ?? "");
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave({ ...(initial ? { id: initial.id } : {}), name: name.trim(), description: description.trim() || null, photoUrl: photoUrl.trim() || null });
  }
  return <div className="dialog-backdrop" role="presentation" onMouseDown={event => event.target === event.currentTarget && onCancel()}>
    <form className="player-dialog admin-editor taxonomy-editor" role="dialog" aria-modal="true" aria-labelledby="interpreter-editor-heading" onSubmit={submit}>
      <div className="dialog-head"><div><span className="eyebrow">Interpreter directory</span><h2 id="interpreter-editor-heading" style={{ marginTop: 5 }}>{initial ? "Edit interpreter" : "Add interpreter"}</h2></div><button className="icon-button" type="button" onClick={onCancel} aria-label="Close interpreter editor"><X size={17} /></button></div>
      <div className="taxonomy-form-body"><div className="form-field"><label htmlFor="interpreter-name">Name</label><input id="interpreter-name" className="text-control" required maxLength={160} value={name} onChange={event => setName(event.target.value)} placeholder="Interpreter name" /></div>
        <div className="form-field"><label htmlFor="interpreter-description">Profile</label><textarea id="interpreter-description" className="textarea-control" maxLength={5000} value={description} onChange={event => setDescription(event.target.value)} placeholder="Optional short biography or profile details" /></div>
        <div className="form-field"><label htmlFor="interpreter-photo">Profile image URL</label><input id="interpreter-photo" className="text-control" value={photoUrl} onChange={event => setPhotoUrl(event.target.value)} placeholder="HTTPS URL or /manus-storage/…" /><span className="form-hint">Paste a secure HTTPS link or upload a profile image.</span><MediaUpload purpose="interpreter" label="profile image" onUploaded={setPhotoUrl} /></div>
        <p className="form-hint">Renaming updates this interpreter label on every associated title.</p>
        <div className="admin-form-actions"><button className="button-secondary" type="button" onClick={onCancel}>Cancel</button><button className="button-primary" type="submit" disabled={saving}><Save size={14} />{saving ? "Saving…" : "Save profile"}</button></div>
      </div>
    </form>
  </div>;
}

export default function CatalogCollections() {
  const utils = trpc.useUtils();
  const categoriesQuery = trpc.catalog.adminCategories.useQuery(undefined, { retry: false });
  const interpretersQuery = trpc.catalog.adminInterpreters.useQuery(undefined, { retry: false });
  const categories = categoriesQuery.data ?? [];
  const interpreters = interpretersQuery.data ?? [];
  const [categoryEditor, setCategoryEditor] = useState<AdminCategory | null | undefined>(undefined);
  const [interpreterEditor, setInterpreterEditor] = useState<AdminInterpreter | null | undefined>(undefined);

  const refreshCategories = async () => Promise.all([
    utils.catalog.adminCategories.invalidate(), utils.catalog.publicCategories.invalidate(),
    utils.catalog.adminList.invalidate(), utils.catalog.publicList.invalidate(),
  ]);
  const refreshInterpreters = async () => Promise.all([
    utils.catalog.adminInterpreters.invalidate(), utils.catalog.publicInterpreters.invalidate(),
    utils.catalog.adminList.invalidate(), utils.catalog.publicList.invalidate(),
  ]);
  const saveCategory = trpc.catalog.saveCategory.useMutation({ onSuccess: async () => { await refreshCategories(); setCategoryEditor(undefined); toast.success("Category saved"); }, onError: error => toast.error(error.message) });
  const deleteCategory = trpc.catalog.deleteCategory.useMutation({ onSuccess: async () => { await refreshCategories(); toast.success("Category removed"); }, onError: error => toast.error(error.message) });
  const saveInterpreter = trpc.catalog.saveInterpreter.useMutation({ onSuccess: async () => { await refreshInterpreters(); setInterpreterEditor(undefined); toast.success("Interpreter profile saved"); }, onError: error => toast.error(error.message) });
  const deleteInterpreter = trpc.catalog.deleteInterpreter.useMutation({ onSuccess: async () => { await refreshInterpreters(); toast.success("Interpreter profile removed"); }, onError: error => toast.error(error.message) });

  function removeCategory(category: AdminCategory) {
    if (window.confirm(`Remove “${category.name}” and its category label from ${category.titleCount} ${category.titleCount === 1 ? "title" : "titles"}? This cannot be undone.`)) deleteCategory.mutate({ id: category.id });
  }
  function removeInterpreter(interpreter: AdminInterpreter) {
    if (window.confirm(`Remove “${interpreter.name}” and its interpreter label from ${interpreter.titleCount} ${interpreter.titleCount === 1 ? "title" : "titles"}? This cannot be undone.`)) deleteInterpreter.mutate({ id: interpreter.id });
  }

  return <div className="collections-stack">
    <section className="admin-panel"><div className="panel-head"><div><h2>Categories</h2><p>Create and maintain the public genre directory.</p></div><button className="button-primary" onClick={() => setCategoryEditor(null)}><Plus size={14} /> Add category</button></div>
      {categoriesQuery.isLoading ? <div className="empty-state"><p>Loading categories…</p></div> : categories.length ? <div className="collection-grid">{categories.map(category => <article className="collection-card" key={category.id}><div className="collection-card-mark"><Tags size={17} /></div><div className="collection-card-main"><h3>{category.name}</h3><p>{category.description || "No description yet."}</p><span className="category-count">{category.titleCount} {category.titleCount === 1 ? "title" : "titles"}</span></div><div className="row-actions"><button className="row-action" title={`Edit ${category.name}`} aria-label={`Edit ${category.name}`} onClick={() => setCategoryEditor(category)}><Pencil size={14} /></button><button className="row-action" title={`Remove ${category.name}`} aria-label={`Remove ${category.name}`} onClick={() => removeCategory(category)}><Trash2 size={14} /></button></div></article>)}</div> : <div className="empty-state"><p>No categories yet. Add them here or they will be created when a title uses a new category label.</p></div>}
    </section>
    <section className="admin-panel"><div className="panel-head"><div><h2>Interpreters</h2><p>Manage public interpreter profiles and the names attached to titles.</p></div><button className="button-primary" onClick={() => setInterpreterEditor(null)}><Plus size={14} /> Add interpreter</button></div>
      {interpretersQuery.isLoading ? <div className="empty-state"><p>Loading interpreter profiles…</p></div> : interpreters.length ? <div className="collection-grid">{interpreters.map(interpreter => <article className="collection-card" key={interpreter.id}><div className="collection-card-mark">{interpreter.photoUrl ? <img src={interpreter.photoUrl} alt="" /> : <ImagePlus size={17} />}</div><div className="collection-card-main"><h3>{interpreter.name}</h3><p>{interpreter.description || "No profile details yet."}</p><span className="category-count">{interpreter.titleCount} {interpreter.titleCount === 1 ? "title" : "titles"}</span></div><div className="row-actions"><button className="row-action" title={`Edit ${interpreter.name}`} aria-label={`Edit ${interpreter.name}`} onClick={() => setInterpreterEditor(interpreter)}><Pencil size={14} /></button><button className="row-action" title={`Remove ${interpreter.name}`} aria-label={`Remove ${interpreter.name}`} onClick={() => removeInterpreter(interpreter)}><Trash2 size={14} /></button></div></article>)}</div> : <div className="empty-state"><p>No interpreter profiles yet. Add a profile here or add a name when cataloging a title.</p></div>}
    </section>
    {categoryEditor !== undefined && <CategoryEditor key={categoryEditor?.id ?? "new-category"} initial={categoryEditor} saving={saveCategory.isPending} onCancel={() => setCategoryEditor(undefined)} onSave={input => saveCategory.mutate(input)} />}
    {interpreterEditor !== undefined && <InterpreterEditor key={interpreterEditor?.id ?? "new-interpreter"} initial={interpreterEditor} saving={saveInterpreter.isPending} onCancel={() => setInterpreterEditor(undefined)} onSave={input => saveInterpreter.mutate(input)} />}
  </div>;
}
