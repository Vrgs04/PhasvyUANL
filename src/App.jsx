import { useEffect, useMemo, useState } from 'react';
import { EMPTY_LISTING } from './data/defaults.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const navItems = [
  { id: 'explore', label: 'Explorar', icon: 'E' },
  { id: 'create', label: 'Publicar', icon: '+' },
  { id: 'mine', label: 'Mias', icon: 'M' },
  { id: 'profile', label: 'Perfil', icon: 'P' },
];

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function normalizePhone(phone) {
  return phone.replace(/[^\d]/g, '').replace(/^0+/, '');
}

function App() {
  const [view, setView] = useState('explore');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    faculty: '',
    category: '',
    min: '',
    max: '',
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const user = session?.user ?? null;
  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    loadCatalogs();
    loadListings();
  }, []);

  useEffect(() => {
    if (user) loadProfile(user.id);
    if (!user) setProfile(null);
  }, [user?.id]);

  async function loadCatalogs() {
    if (!isSupabaseConfigured) return;
    const [{ data: facultyData }, { data: categoryData }] = await Promise.all([
      supabase.from('faculties').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').eq('is_active', true).order('name'),
    ]);
    setFaculties(facultyData ?? []);
    setCategories(categoryData ?? []);
  }

  async function loadProfile(userId) {
    const { data } = await supabase.from('users').select('*').eq('id', userId).single();
    setProfile(data);
  }

  async function loadListings() {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(
        '*, seller:users(id, full_name, whatsapp, role, is_blocked), faculty:faculties(*), category:categories(*), images:listing_images(*)',
      )
      .order('created_at', { ascending: false });

    if (error) setNotice(error.message);
    setListings(data ?? []);
    setLoading(false);
  }

  const visibleListings = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    return listings.filter((listing) => {
      const matchesSold = isAdmin || listing.status !== 'deleted';
      const matchesFaculty = !filters.faculty || listing.faculty_id === filters.faculty;
      const matchesCategory = !filters.category || listing.category_id === filters.category;
      const matchesMin = !filters.min || Number(listing.price) >= Number(filters.min);
      const matchesMax = !filters.max || Number(listing.price) <= Number(filters.max);
      const haystack = `${listing.title} ${listing.description} ${listing.faculty?.name ?? ''} ${listing.category?.name ?? ''}`.toLowerCase();
      return matchesSold && matchesFaculty && matchesCategory && matchesMin && matchesMax && haystack.includes(term);
    });
  }, [filters, listings, isAdmin]);

  const myListings = useMemo(
    () => listings.filter((listing) => listing.seller_id === user?.id && listing.status !== 'deleted'),
    [listings, user?.id],
  );

  async function signOut() {
    await supabase.auth.signOut();
    setView('explore');
  }

  async function deleteListing(id) {
    const { error } = await supabase.from('listings').update({ status: 'deleted' }).eq('id', id);
    if (error) return setNotice(error.message);
    setNotice('Publicacion eliminada.');
    await loadListings();
  }

  async function markSold(id) {
    const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', id);
    if (error) return setNotice(error.message);
    setNotice('Marcada como vendida.');
    await loadListings();
  }

  async function blockUser(id) {
    const { error } = await supabase.from('users').update({ is_blocked: true }).eq('id', id);
    if (error) return setNotice(error.message);
    setNotice('Usuario bloqueado.');
    await loadListings();
  }

  return (
    <div className="min-h-screen pb-24 text-ink md:pb-10">
      <Header user={user} profile={profile} view={view} onNavigate={setView} isAdmin={isAdmin} />

      {notice && (
        <button
          className="fixed left-4 right-4 top-4 z-50 rounded-3xl border border-white/20 bg-ink/90 px-4 py-3 text-left text-sm font-semibold text-white shadow-ios backdrop-blur-xl md:left-auto md:right-8 md:w-96"
          onClick={() => setNotice('')}
        >
          {notice}
        </button>
      )}

      <main className="mx-auto w-full max-w-7xl px-4 pb-8 pt-5 md:px-6">
        <section className="min-w-0">
          {!isSupabaseConfigured && <SetupWarning />}

          {view === 'explore' && (
            <Explore
              loading={loading}
              listings={visibleListings}
              filters={filters}
              setFilters={setFilters}
              faculties={faculties}
              categories={categories}
              onOpen={setSelectedListing}
            />
          )}

          {view === 'create' && (
            <RequireAuth user={user} setView={setView}>
              <ListingForm
                user={user}
                faculties={faculties}
                categories={categories}
                editing={editingListing}
                onDone={async () => {
                  setEditingListing(null);
                  setView('mine');
                  await loadListings();
                }}
                setNotice={setNotice}
              />
            </RequireAuth>
          )}

          {view === 'mine' && (
            <RequireAuth user={user} setView={setView}>
              <MyListings
                listings={myListings}
                onOpen={setSelectedListing}
                onEdit={(listing) => {
                  setEditingListing(listing);
                  setView('create');
                }}
                onSold={markSold}
                onDelete={deleteListing}
              />
            </RequireAuth>
          )}

          {view === 'profile' && (
            <Profile
              user={user}
              profile={profile}
              onSaved={() => user && loadProfile(user.id)}
              onSignOut={signOut}
              setNotice={setNotice}
            />
          )}

          {view === 'admin' && (
            <RequireAuth user={user} setView={setView}>
              <AdminPanel
                isAdmin={isAdmin}
                listings={listings}
                faculties={faculties}
                categories={categories}
                reload={async () => {
                  await loadCatalogs();
                  await loadListings();
                }}
                onDelete={deleteListing}
                onBlock={blockUser}
                setNotice={setNotice}
              />
            </RequireAuth>
          )}
        </section>
      </main>

      <button
        className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10 text-3xl font-light text-white shadow-ios backdrop-blur-2xl md:hidden"
        onClick={() => setView(user ? 'create' : 'profile')}
        aria-label="Crear publicacion"
      >
        +
      </button>

      <MobileNav view={view} setView={setView} isAdmin={isAdmin} />

      {selectedListing && (
        <ListingDetail
          listing={selectedListing}
          canManage={isAdmin || selectedListing.seller_id === user?.id}
          onClose={() => setSelectedListing(null)}
          onDelete={deleteListing}
          onSold={markSold}
        />
      )}
    </div>
  );
}

function Header({ user, profile, view, onNavigate, isAdmin }) {
  const items = isAdmin ? [...navItems, { id: 'admin', label: 'Admin', icon: 'A' }] : navItems;
  const displayName = user ? profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Perfil' : 'Invitado';

  return (
    <header className="sticky top-0 z-20 px-3 py-3 md:px-6">
      <div className="liquid mx-auto grid max-w-7xl gap-3 rounded-[28px] px-3 py-3 md:grid-cols-[minmax(190px,0.75fr)_auto_minmax(190px,0.75fr)] md:items-center">
        <button
          className="flex min-w-0 items-center gap-3 rounded-3xl px-2 py-1 text-left transition hover:bg-white/10"
          onClick={() => onNavigate(user ? 'profile' : 'profile')}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-sm font-black text-ink">
            {displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black">{displayName}</span>
            <span className="block truncate text-xs font-semibold text-white/60">{user ? 'Cuenta activa' : 'Iniciar sesion'}</span>
          </span>
        </button>

        <nav className="hidden rounded-3xl bg-white/10 p-1 md:flex md:w-auto">
          {items.map((item) => (
            <button
              key={item.id}
              className={cx(
                'rounded-2xl px-3 py-2 text-xs font-black transition md:px-4',
                view === item.id ? 'bg-white text-ink shadow-soft' : 'text-white/70 hover:bg-white/10 hover:text-white',
              )}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="hidden justify-self-end rounded-3xl border border-white/20 bg-white px-4 py-3 text-sm font-black text-ink shadow-soft transition active:scale-[0.98] md:inline-flex" onClick={() => onNavigate(user ? 'create' : 'profile')}>
          Publicar
        </button>

        <button className="absolute right-5 top-5 rounded-full bg-white/10 px-3 py-1 text-xs font-black text-white md:hidden" onClick={() => onNavigate('explore')}>
          Phasvy
        </button>
      </div>
    </header>
  );
}

function Sidebar({ view, setView, isAdmin }) {
  const items = isAdmin ? [...navItems, { id: 'admin', label: 'Admin', icon: 'A' }] : navItems;
  return (
    <nav className="panel sticky top-24 space-y-2 p-3">
      {items.map((item) => (
        <button
          key={item.id}
          className={cx('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold', view === item.id ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-50')}
          onClick={() => setView(item.id)}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function MobileNav({ view, setView, isAdmin }) {
  const items = isAdmin ? [...navItems, { id: 'admin', label: 'Admin', icon: 'A' }] : navItems;
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 md:hidden">
      <div className={cx('liquid mx-auto grid max-w-md gap-1 rounded-[26px] p-1.5', isAdmin ? 'grid-cols-5' : 'grid-cols-4')}>
        {items.map((item) => (
          <button
            key={item.id}
            className={cx('rounded-2xl px-2 py-2 text-xs font-black transition', view === item.id ? 'bg-white text-ink' : 'text-white/60')}
            onClick={() => setView(item.id)}
          >
            <span className="mx-auto mb-1 grid h-5 w-5 place-items-center rounded-full text-[10px] leading-none">{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function SetupWarning() {
  return (
    <div className="panel mb-5 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      Configura Supabase copiando <strong>.env.example</strong> a <strong>.env</strong> y agregando tus credenciales.
      La interfaz carga, pero las funciones reales necesitan base de datos.
    </div>
  );
}

function Explore({ loading, listings, filters, setFilters, faculties, categories, onOpen }) {
  return (
    <div className="space-y-5">
      <div className="dark-panel overflow-hidden p-5 md:p-8">
        <div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-white/50">Marketplace UANL</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Compra y vende dentro del campus.</h1>
            <p className="mt-4 max-w-xl text-sm font-medium leading-6 text-white/60 md:text-base">
              Encuentra libros, tecnologia, comida y servicios por facultad. Sin pagos en linea, sin envios, contacto directo por WhatsApp.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 md:w-64">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-3xl font-black">{listings.length}</p>
              <p className="text-xs font-bold text-white/50">publicaciones</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-4">
              <p className="text-3xl font-black">UANL</p>
              <p className="text-xs font-bold text-white/50">facultades</p>
            </div>
          </div>
        </div>
      </div>

      <Filters filters={filters} setFilters={setFilters} faculties={faculties} categories={categories} />

      {loading ? (
        <div className="panel p-8 text-center font-semibold text-slate-500">Cargando publicaciones...</div>
      ) : listings.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-black">No hay publicaciones con esos filtros.</p>
          <p className="mt-1 text-sm text-slate-500">Prueba con otra facultad, categoria o rango de precio.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onOpen={() => onOpen(listing)} />
          ))}
        </div>
      )}
    </div>
  );
}

function Filters({ filters, setFilters, faculties, categories }) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  return (
    <div className="panel space-y-3 p-4">
      <input className="field" placeholder="Buscar libros, calculadora, comida, asesorias..." value={filters.q} onChange={(event) => update('q', event.target.value)} />
      <div className="grid gap-3 md:grid-cols-[1.1fr_1.1fr_0.8fr_0.8fr]">
        <select className="field" value={filters.faculty} onChange={(event) => update('faculty', event.target.value)}>
          <option value="">Todas las facultades</option>
          {faculties.map((faculty) => (
            <option key={faculty.id} value={faculty.id}>
              {faculty.name}
            </option>
          ))}
        </select>
        <select className="field" value={filters.category} onChange={(event) => update('category', event.target.value)}>
          <option value="">Todas las categorias</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <input className="field" type="number" min="0" placeholder="Precio min." value={filters.min} onChange={(event) => update('min', event.target.value)} />
        <input className="field" type="number" min="0" placeholder="Precio max." value={filters.max} onChange={(event) => update('max', event.target.value)} />
      </div>
    </div>
  );
}

function ListingCard({ listing, onOpen }) {
  const cover = listing.images?.[0]?.url;
  return (
    <button className="panel overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-ios" onClick={onOpen}>
      <div className="aspect-[4/3] bg-slate-100 p-2">
        <div className="h-full overflow-hidden rounded-[22px] bg-slate-200">
          {cover ? <img src={cover} alt={listing.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl text-slate-300">+</div>}
        </div>
      </div>
      <div className="space-y-3 p-4 pt-2">
        <h2 className="line-clamp-2 text-lg font-black leading-tight">{listing.title}</h2>
        <p className="line-clamp-2 text-sm text-slate-500">{listing.description}</p>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-slate-500">{listing.faculty?.name ?? 'UANL'}</p>
            <p className="truncate text-xs font-bold text-slate-400">{listing.category?.name ?? 'General'}</p>
          </div>
          <p className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-sm font-black text-white">{currency.format(listing.price ?? 0)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {listing.status === 'sold' && <span className="rounded-full bg-coral/10 px-3 py-1 text-xs font-bold text-coral">Vendido</span>}
        </div>
      </div>
    </button>
  );
}

function ListingDetail({ listing, canManage, onClose, onDelete, onSold }) {
  const coverImages = listing.images?.length ? listing.images : [{ url: '' }];
  const phone = normalizePhone(listing.whatsapp || listing.seller?.whatsapp || '');
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, vi tu publicacion "${listing.title}" en Phasvy Campus.`)}` : '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/30 p-3 backdrop-blur-sm md:p-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-ios">
        <div className="grid md:grid-cols-2">
          <div className="bg-slate-100">
            <div className="flex snap-x gap-2 overflow-x-auto no-scrollbar">
              {coverImages.map((image, index) => (
                <div key={image.id ?? index} className="aspect-square min-w-full">
                  {image.url ? <img src={image.url} alt="" className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-slate-300">Sin imagen</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5 p-5 md:p-7">
            <div className="flex justify-between gap-4">
              <div>
                <p className="label">{listing.faculty?.name} - {listing.category?.name}</p>
                <h2 className="mt-2 text-3xl font-black">{listing.title}</h2>
              </div>
              <button className="secondary-btn !h-11 !w-11 !rounded-full !p-0" onClick={onClose} aria-label="Cerrar">x</button>
            </div>
            <p className="text-3xl font-black text-campus">{currency.format(listing.price ?? 0)}</p>
            <p className="whitespace-pre-wrap text-slate-600">{listing.description}</p>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-black">{listing.seller?.full_name ?? 'Vendedor UANL'}</p>
              <p className="text-slate-500">{listing.contact_note || 'Acuerda entrega dentro del campus. No hay pagos en linea ni envios en esta version.'}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {whatsappUrl ? (
                <a className="primary-btn" href={whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a>
              ) : (
                <button className="primary-btn" disabled>Sin WhatsApp</button>
              )}
              <a className="secondary-btn" href={`mailto:${listing.seller?.email ?? ''}?subject=Phasvy Campus: ${listing.title}`}>Contacto</a>
            </div>
            {canManage && (
              <div className="grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                <button className="secondary-btn" onClick={() => onSold(listing.id)}>Marcar vendido</button>
                <button className="secondary-btn !border-coral/30 !text-coral" onClick={() => onDelete(listing.id)}>Eliminar</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function RequireAuth({ user, setView, children }) {
  if (user) return children;
  return (
    <div className="panel p-8 text-center">
      <h2 className="text-2xl font-black">Inicia sesion para continuar</h2>
      <p className="mt-2 text-slate-500">Necesitas una cuenta para publicar, editar o ver tus publicaciones.</p>
      <button className="primary-btn mt-5" onClick={() => setView('profile')}>Entrar o registrarme</button>
    </div>
  );
}

function ListingForm({ user, faculties, categories, editing, onDone, setNotice }) {
  const [form, setForm] = useState(editing ?? EMPTY_LISTING);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setForm(editing ?? EMPTY_LISTING);
  }, [editing?.id]);

  async function saveListing(event) {
    event.preventDefault();
    setSaving(true);

    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      faculty_id: form.faculty_id,
      category_id: form.category_id,
      whatsapp: form.whatsapp,
      contact_note: form.contact_note,
      seller_id: user.id,
      status: editing?.status ?? 'active',
    };

    const result = editing?.id
      ? await supabase.from('listings').update(payload).eq('id', editing.id).select().single()
      : await supabase.from('listings').insert(payload).select().single();

    if (result.error) {
      setSaving(false);
      return setNotice(result.error.message);
    }

    for (const file of files) {
      const path = `${user.id}/${result.data.id}/${Date.now()}-${file.name}`;
      const upload = await supabase.storage.from('listing-images').upload(path, file, { upsert: false });
      if (upload.error) {
        setNotice(upload.error.message);
        continue;
      }
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
      await supabase.from('listing_images').insert({
        listing_id: result.data.id,
        url: data.publicUrl,
        storage_path: path,
      });
    }

    setSaving(false);
    setNotice(editing?.id ? 'Publicacion actualizada.' : 'Publicacion creada.');
    onDone();
  }

  return (
    <form className="panel mx-auto max-w-3xl space-y-4 p-4 md:p-6" onSubmit={saveListing}>
      <div>
        <p className="label">{editing ? 'Editar publicacion' : 'Nueva publicacion'}</p>
        <h1 className="mt-2 text-3xl font-black">Publica para tu facultad</h1>
      </div>
      <input className="field" required placeholder="Titulo" value={form.title} onChange={(event) => update('title', event.target.value)} />
      <textarea className="field min-h-32" required placeholder="Descripcion, estado, punto de entrega..." value={form.description} onChange={(event) => update('description', event.target.value)} />
      <div className="grid gap-3 md:grid-cols-3">
        <input className="field" required type="number" min="0" placeholder="Precio MXN" value={form.price} onChange={(event) => update('price', event.target.value)} />
        <select className="field" required value={form.faculty_id} onChange={(event) => update('faculty_id', event.target.value)}>
          <option value="">Facultad</option>
          {faculties.map((faculty) => <option key={faculty.id} value={faculty.id}>{faculty.name}</option>)}
        </select>
        <select className="field" required value={form.category_id} onChange={(event) => update('category_id', event.target.value)}>
          <option value="">Categoria</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <input className="field" placeholder="WhatsApp con lada" value={form.whatsapp ?? ''} onChange={(event) => update('whatsapp', event.target.value)} />
        <input className="field" placeholder="Nota de contacto opcional" value={form.contact_note ?? ''} onChange={(event) => update('contact_note', event.target.value)} />
      </div>
      <label className="block rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-500">
        Subir imagenes
        <input className="sr-only" type="file" multiple accept="image/*" onChange={(event) => setFiles(Array.from(event.target.files ?? []))} />
        {files.length > 0 && <span className="mt-2 block text-ink">{files.length} archivo(s) seleccionado(s)</span>}
      </label>
      <button className="primary-btn w-full" disabled={saving}>{saving ? 'Guardando...' : 'Guardar publicacion'}</button>
    </form>
  );
}

function MyListings({ listings, onOpen, onEdit, onSold, onDelete }) {
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-black">Mis publicaciones</h1>
      {listings.length === 0 ? (
        <div className="panel p-8 text-center text-slate-500">Todavia no tienes publicaciones.</div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {listings.map((listing) => (
            <div key={listing.id} className="panel grid grid-cols-[104px_1fr] overflow-hidden">
              <button className="bg-slate-100" onClick={() => onOpen(listing)}>
                {listing.images?.[0]?.url && <img src={listing.images[0].url} alt="" className="h-full w-full object-cover" />}
              </button>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-black">{listing.title}</h2>
                    <p className="text-sm text-slate-500">{listing.status}</p>
                  </div>
                  <p className="font-black text-campus">{currency.format(listing.price ?? 0)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button className="secondary-btn !px-2 !py-2" onClick={() => onOpen(listing)}>Ver</button>
                  <button className="secondary-btn !px-2 !py-2" onClick={() => onEdit(listing)}>Editar</button>
                  <button className="secondary-btn !px-2 !py-2" onClick={() => onSold(listing.id)}>Vendido</button>
                </div>
                <button className="w-full text-sm font-bold text-coral" onClick={() => onDelete(listing.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Profile({ user, profile, onSaved, onSignOut, setNotice }) {
  if (!isSupabaseConfigured) return <SetupWarning />;
  if (!user) return <AuthForm setNotice={setNotice} />;
  return <ProfileForm user={user} profile={profile} onSaved={onSaved} onSignOut={onSignOut} setNotice={setNotice} />;
}

function AuthForm({ setNotice }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [saving, setSaving] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showMailHelp, setShowMailHelp] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const result =
      mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { data: { full_name: fullName, whatsapp } },
          });
    setSaving(false);
    if (result.error) return setNotice(result.error.message);
    if (mode === 'signup') {
      setVerificationSent(true);
      setShowMailHelp(false);
      return;
    }
    setNotice('Sesion iniciada.');
  }

  if (verificationSent) {
    return (
      <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[0.9fr_1.1fr]">
        <div className="dark-panel p-6 md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.12em] text-white/50">Verifica tu cuenta</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight">Revisa tu correo.</h1>
          <p className="mt-4 text-sm leading-6 text-white/60">
            Enviamos un enlace de verificacion a <strong className="text-white">{email}</strong>. Despues de confirmarlo podras iniciar sesion y entrar a Phasvy Campus.
          </p>
        </div>
        <div className="panel space-y-4 p-5 md:p-6">
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-sm font-black">Correo de verificacion enviado</p>
            <p className="mt-1 text-sm text-slate-500">Supabase protege la app validando que el correo exista antes de activar la cuenta.</p>
          </div>
          <button
            className="primary-btn w-full"
            onClick={async () => {
              const result = await supabase.auth.signInWithPassword({ email, password });
              if (result.error) {
                setNotice('Todavia no se pudo entrar. Confirma el correo y vuelve a intentar.');
                return;
              }
              setVerificationSent(false);
              setMode('login');
            }}
          >
            Ya lo recibi
          </button>
          <button className="secondary-btn w-full" onClick={() => setShowMailHelp(true)}>
            No me llego ningun correo
          </button>
          {showMailHelp && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              Revisa tu bandeja de spam y verifica que tu correo este bien escrito.
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[0.95fr_1.05fr]">
      <div className="dark-panel p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-white/50">Acceso campus</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{mode === 'login' ? 'Entra a tu mercado UANL.' : 'Crea tu cuenta en segundos.'}</h1>
        <p className="mt-4 text-sm leading-6 text-white/60">
          Publica, guarda contacto y administra tus anuncios desde un perfil simple. Todo pensado para alumnos y entregas dentro del campus.
        </p>
      </div>
      <form className="panel space-y-4 p-5 md:p-6" onSubmit={submit}>
        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-slate-100 p-1">
          <button type="button" className={cx('rounded-2xl py-3 text-sm font-black transition', mode === 'login' && 'bg-white shadow-soft')} onClick={() => setMode('login')}>Login</button>
          <button type="button" className={cx('rounded-2xl py-3 text-sm font-black transition', mode === 'signup' && 'bg-white shadow-soft')} onClick={() => setMode('signup')}>Registro</button>
        </div>
        {mode === 'signup' && (
          <>
            <input className="field" required placeholder="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <input className="field" placeholder="WhatsApp" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} />
          </>
        )}
        <input className="field" required type="email" placeholder="Correo UANL o personal" value={email} onChange={(event) => setEmail(event.target.value)} />
        <input className="field" required type="password" minLength="6" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
        <button className="primary-btn w-full" disabled={saving}>{saving ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
    </div>
  );
}

function ProfileForm({ user, profile, onSaved, onSignOut, setNotice }) {
  const [form, setForm] = useState({ full_name: '', whatsapp: '', faculty_id: '' });

  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? '',
      whatsapp: profile?.whatsapp ?? user.user_metadata?.whatsapp ?? '',
      faculty_id: profile?.faculty_id ?? '',
    });
  }, [profile?.id, user.id]);

  async function save(event) {
    event.preventDefault();
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: form.full_name,
      whatsapp: form.whatsapp,
      faculty_id: form.faculty_id || null,
    });
    if (error) return setNotice(error.message);
    setNotice('Perfil guardado.');
    onSaved();
  }

  return (
    <form className="panel mx-auto max-w-xl space-y-4 p-5" onSubmit={save}>
      <div>
        <p className="label">Perfil</p>
        <h1 className="mt-2 text-3xl font-black">{profile?.full_name || user.email}</h1>
      </div>
      <input className="field" required placeholder="Nombre completo" value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
      <input className="field" placeholder="WhatsApp" value={form.whatsapp} onChange={(event) => setForm({ ...form, whatsapp: event.target.value })} />
      <button className="primary-btn w-full">Guardar perfil</button>
      <button type="button" className="secondary-btn w-full" onClick={onSignOut}>Cerrar sesion</button>
    </form>
  );
}

function AdminPanel({ isAdmin, listings, faculties, categories, reload, onDelete, onBlock, setNotice }) {
  if (!isAdmin) {
    return <div className="panel p-8 text-center font-black">No tienes permisos de administrador.</div>;
  }
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Panel administrador</h1>
      <CatalogManager title="Facultades" table="faculties" items={faculties} reload={reload} setNotice={setNotice} />
      <CatalogManager title="Categorias" table="categories" items={categories} reload={reload} setNotice={setNotice} />
      <div className="panel overflow-hidden">
        <div className="border-b border-slate-100 p-4">
          <h2 className="font-black">Todas las publicaciones</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {listings.map((listing) => (
            <div key={listing.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-black">{listing.title}</p>
                <p className="text-sm text-slate-500">{listing.seller?.full_name ?? listing.seller_id} - {listing.status}</p>
              </div>
              <div className="flex gap-2">
                <button className="secondary-btn !py-2" onClick={() => onBlock(listing.seller_id)}>Bloquear</button>
                <button className="secondary-btn !border-coral/30 !py-2 !text-coral" onClick={() => onDelete(listing.id)}>Eliminar</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CatalogManager({ title, table, items, reload, setNotice }) {
  const [name, setName] = useState('');
  async function add(event) {
    event.preventDefault();
    const { error } = await supabase.from(table).insert({ name });
    if (error) return setNotice(error.message);
    setName('');
    await reload();
  }
  async function toggle(item) {
    const { error } = await supabase.from(table).update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) return setNotice(error.message);
    await reload();
  }
  return (
    <div className="panel p-4">
      <h2 className="font-black">{title}</h2>
      <form className="mt-3 flex gap-2" onSubmit={add}>
        <input className="field" required placeholder={`Nueva ${title.toLowerCase()}`} value={name} onChange={(event) => setName(event.target.value)} />
        <button className="primary-btn">Agregar</button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <button key={item.id} className="chip" onClick={() => toggle(item)}>{item.name}</button>
        ))}
      </div>
    </div>
  );
}

export default App;
