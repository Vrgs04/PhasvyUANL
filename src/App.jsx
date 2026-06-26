import { useEffect, useMemo, useState } from 'react';
import { EMPTY_LISTING } from './data/defaults.js';
import { DEMO_CATEGORIES, DEMO_FACULTIES, DEMO_LISTINGS } from './data/demo.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const navItems = [
  { id: 'explore', label: 'Publicaciones', icon: 'P' },
  { id: 'profile', label: 'Perfil', icon: 'P' },
];
const sellerNavItems = [
  { id: 'explore', label: 'Publicaciones', icon: 'P' },
  { id: 'create', label: 'Publicar', icon: '+' },
  { id: 'mine', label: 'Mias', icon: 'M' },
  { id: 'profile', label: 'Perfil', icon: 'P' },
];

const QUICK_FACULTIES = ['FIME', 'FACPyA', 'FACDyC', 'Medicina', 'FAPSI', 'FARQ', 'Odontologia', 'FCQ'];
const CAMPUS_GROUPS = [
  { id: 'cu', label: 'CU', names: ['FIME', 'FACPyA', 'FACDyC', 'FCQ'] },
  { id: 'agro', label: 'Agropecuarias', names: ['Agronomia', 'Medicina Veterinaria', 'Veterinaria'] },
  { id: 'salud', label: 'Salud', names: ['Medicina', 'Odontologia'] },
  { id: 'mederos', label: 'Mederos', names: ['FAPSI', 'FARQ'] },
];
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const FACULTY_BRANDS = {
  FIME: { color: '#006b4f', logo: '/faculties/fime.svg' },
  FACPyA: { color: '#0f5ea8', logo: '/faculties/facpya.svg' },
  FACDyC: { color: '#7c2d12', logo: '/faculties/facdyc.svg' },
  Medicina: { color: '#b91c1c', logo: '/faculties/medicina.svg' },
  FAPSI: { color: '#7c3aed', logo: '/faculties/fapsi.svg' },
  FARQ: { color: '#334155', logo: '/faculties/farq.svg' },
  Odontologia: { color: '#0891b2', logo: '/faculties/odontologia.svg' },
  FCQ: { color: '#15803d', logo: '/faculties/fcq.svg' },
};
const FEATURED_CATEGORIES = [
  { name: 'Comidas', title: 'Comidas', text: 'Busca lo que estan vendiendo ahora mismo en tu facultad.', image: '/categories/comidas.svg' },
  { name: 'Bebidas', title: 'Refrescos', text: 'Encuentra bebidas frias, aguas preparadas y cafe entre clases.', image: '/categories/refrescos.svg' },
  { name: 'Postres', title: 'Pan de dulce', text: 'Antojos, brownies y postres hechos por alumnos.', image: '/categories/postres.svg' },
];
const HERO_SLIDES = [
  { title: '¿Tienes hambre?', text: 'Encuentra productos que se estan vendiendo ahora mismo en FIME.', faculty: 'FIME', image: '/campus/hero-fime.svg' },
  { title: 'Compra dentro de la UANL', text: 'Filtra por facultad y acuerda entrega directa por WhatsApp.', faculty: 'UANL', image: '/campus/hero-campus.svg' },
  { title: 'Vende entre clases', text: 'Publica comida, bebidas, postres, libros o servicios en minutos.', faculty: 'Campus', image: '/campus/hero-vendedores.svg' },
];
const PHONE_CODES = [
  { label: '🇲🇽 +52', value: '52', country: 'Mexico' },
  { label: '🇺🇸 +1', value: '1', country: 'Estados Unidos' },
  { label: '🇨🇦 +1', value: '1', country: 'Canada' },
  { label: '🇨🇴 +57', value: '57', country: 'Colombia' },
  { label: '🇦🇷 +54', value: '54', country: 'Argentina' },
  { label: '🇨🇱 +56', value: '56', country: 'Chile' },
  { label: '🇪🇸 +34', value: '34', country: 'Espana' },
];

const INFO_PAGES = {
  about: {
    title: 'Quienes somos',
    eyebrow: 'Phasvy Campus',
    body: [
      'Phasvy Campus es un marketplace universitario para alumnos de la UANL. Ayuda a encontrar comida, bebidas, postres, libros, tecnologia y servicios cerca de cada facultad.',
      'La primera version funciona sin pagos en linea y sin envios. El trato se acuerda directamente entre comprador y vendedor por WhatsApp o contacto directo.',
    ],
  },
  stores: {
    title: 'Visita las tiendas',
    eyebrow: 'Explorar vendedores',
    body: [
      'Explora por facultad para ver publicaciones activas y vendedores destacados. Las calificaciones ayudan a detectar vendedores constantes y productos bien evaluados.',
      'Revisa el detalle de cada publicacion antes de contactar y acuerda entregas en puntos seguros dentro del campus.',
    ],
  },
  account: {
    title: 'Detalles de tu cuenta',
    eyebrow: 'Perfil y publicaciones',
    body: [
      'Desde tu perfil puedes actualizar tu nombre, WhatsApp y foto. En Mis publicaciones puedes editar, marcar como vendido o eliminar tus anuncios.',
      'Para publicar necesitas iniciar sesion. Phasvy protege el flujo con autenticacion de Supabase y reglas de seguridad por usuario.',
    ],
  },
  privacy: {
    title: 'Politica de privacidad',
    eyebrow: 'Datos personales',
    body: [
      'Usamos tu correo, nombre, WhatsApp y foto de perfil para mostrar tu identidad como vendedor y permitir el contacto dentro del marketplace.',
      'No se procesan pagos en linea. Los datos se almacenan en Supabase y se usan solo para operar Phasvy Campus.',
    ],
  },
  terms: {
    title: 'Terminos y condiciones',
    eyebrow: 'Reglas de uso',
    body: [
      'No publiques productos ilegales, contenido enganoso, spam, resenas falsas ni informacion de terceros sin permiso.',
      'Los acuerdos de compra, entrega y pago se realizan entre usuarios. Phasvy Campus facilita el contacto, pero no gestiona envios ni pagos.',
    ],
  },
  contact: {
    title: 'Contacto',
    eyebrow: 'Ayuda y reportes',
    body: [
      'Si encuentras una publicacion inapropiada, un vendedor sospechoso o un problema con tu cuenta, contacta al administrador del proyecto.',
      'Para una version productiva, conecta este apartado a un correo oficial o formulario de soporte dentro de Supabase.',
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    eyebrow: 'Sesion y preferencias',
    body: [
      'La app puede usar almacenamiento local y cookies tecnicas para mantener la sesion, recordar preferencias y permitir que la PWA funcione correctamente.',
      'No se usan cookies de publicidad en esta primera version.',
    ],
  },
};

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

function normalizePhone(phone) {
  return phone.replace(/[^\d]/g, '').replace(/^0+/, '');
}

function getReviews(listing) {
  return Array.isArray(listing.reviews) ? listing.reviews.filter((review) => review.status !== 'hidden') : [];
}

function averageRating(reviews, fallback = 0) {
  if (!reviews.length) return Number(fallback || 0);
  const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
  return Number((total / reviews.length).toFixed(1));
}

function getListingRating(listing) {
  return averageRating(getReviews(listing), listing.rating);
}

function getSellerStats(listings, sellerId) {
  const sellerListings = listings.filter((listing) => listing.seller_id === sellerId);
  const reviews = sellerListings.flatMap((listing) => getReviews(listing));
  return {
    rating: averageRating(reviews, sellerListings[0]?.seller?.rating),
    reviewCount: reviews.length || sellerListings.reduce((sum, listing) => sum + Number(listing.reviews_count || 0), 0),
    listingCount: sellerListings.length,
  };
}

function getTopSellers(listings) {
  const sellerIds = [...new Set(listings.map((listing) => listing.seller_id).filter(Boolean))];
  return sellerIds
    .map((sellerId) => {
      const listing = listings.find((item) => item.seller_id === sellerId);
      return {
        id: sellerId,
        seller: listing?.seller,
        ...getSellerStats(listings, sellerId),
      };
    })
    .sort((a, b) => (b.rating - a.rating) || (b.reviewCount - a.reviewCount) || (b.listingCount - a.listingCount))
    .slice(0, 5);
}

function isSuspiciousReview(text) {
  const normalized = text.trim().toLowerCase();
  return (
    normalized.length < 12 ||
    normalized.length > 360 ||
    /(https?:\/\/|www\.|bit\.ly|wa\.me|t\.me)/i.test(normalized) ||
    /(.)\1{7,}/.test(normalized) ||
    /(gratis\s+dinero|promocion\s+externa|compra\s+seguidores)/i.test(normalized)
  );
}

function getNavigationItems(isSeller, isAdmin) {
  const items = isSeller || isAdmin ? sellerNavItems : navItems;
  return isAdmin ? [...items, { id: 'admin', label: 'Admin', icon: 'A' }] : items;
}

function getFacultyIdsByNames(faculties, names) {
  return names
    .map((name) => faculties.find((faculty) => faculty.name.toLowerCase() === name.toLowerCase())?.id)
    .filter(Boolean);
}

function getSelectedFacultyIds(filters) {
  if (filters.faculties?.length) return filters.faculties;
  return filters.faculty ? [filters.faculty] : [];
}

function getErrorMessage(error, context = '') {
  if (error && typeof error === 'object' && !error.message && Object.keys(error).length === 0) {
    if (context === 'login') {
      return 'No se pudo iniciar sesion. Revisa que Email/Password este habilitado en Supabase Auth y que las variables de Supabase en Cloudflare sean correctas.';
    }
    if (context === 'signup') {
      return 'No se pudo crear la cuenta. Revisa que Email/Password este habilitado en Supabase Auth, que el correo no exista ya y que las variables de Supabase sean correctas.';
    }
    return 'No se pudo completar la accion. Revisa que Supabase Auth este activo, que las variables VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY sean correctas y ejecuta supabase/schema.sql.';
  }
  const message = String(error?.message ?? error?.error_description ?? error ?? '');
  if (message === '{}' || message === '[object Object]') {
    if (context === 'login') {
      return 'No se pudo iniciar sesion. Verifica correo/contrasena y que tu correo ya este confirmado.';
    }
    if (context === 'signup') {
      return 'No se pudo registrar. Si el correo ya existe, inicia sesion; si no, revisa Email/Password en Supabase Auth.';
    }
    return 'No se pudo completar la accion. Revisa la configuracion de Supabase.';
  }
  if (message.toLowerCase().includes('email rate limit exceeded')) {
    return 'Supabase limito temporalmente el envio de correos de verificacion. Espera unos minutos antes de intentar otra vez, o configura SMTP propio en Supabase para aumentar el limite.';
  }
  if (message.toLowerCase().includes('public.listings') || message.toLowerCase().includes('schema cache')) {
    return 'Aun falta crear las tablas de Supabase. Ejecuta supabase/schema.sql en el SQL Editor; mientras tanto se muestran datos demo.';
  }
  if (message.toLowerCase().includes('listing_reviews') || message.toLowerCase().includes('violates row-level security')) {
    return 'No se pudo guardar la resena. Ejecuta el supabase/schema.sql actualizado para crear permisos y tabla listing_reviews.';
  }
  if (message.toLowerCase().includes('bucket not found')) {
    return 'No existe el bucket de Storage. Ejecuta supabase/repair-current-project.sql en Supabase SQL Editor para crear el bucket avatars.';
  }
  if (message.toLowerCase().includes('listings_description_check')) {
    return 'La descripcion debe tener al menos 10 caracteres.';
  }
  if (message.toLowerCase().includes('invalid login credentials')) {
    return 'Correo o contrasena incorrectos.';
  }
  if (message.toLowerCase().includes('user already registered') || message.toLowerCase().includes('already registered')) {
    return 'Ese correo ya esta registrado. Inicia sesion o usa otro correo.';
  }
  if (message.toLowerCase().includes('provider is not enabled') || message.toLowerCase().includes('unsupported provider')) {
    return 'Google todavia no esta habilitado en Supabase Auth. Activalo en Authentication > Providers > Google.';
  }
  if (message.toLowerCase().includes('email not confirmed')) {
    return 'Tu correo aun no esta verificado. Revisa tu bandeja de entrada o spam.';
  }
  if (message.toLowerCase().includes('more than one relationship') && message.toLowerCase().includes('listings')) {
    return 'Supabase tiene relaciones duplicadas en listings. Ejecuta el schema actualizado o espera el redeploy; mientras tanto se muestran datos demo.';
  }
  return message || 'Ocurrio un error inesperado.';
}

function isMissingListingsError(error) {
  const message = String(error?.message ?? error ?? '').toLowerCase();
  return message.includes('public.listings') || message.includes('schema cache');
}

function App() {
  const [view, setView] = useState('explore');
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [faculties, setFaculties] = useState([]);
  const [categories, setCategories] = useState([]);
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [selectedFacultyId, setSelectedFacultyId] = useState('');
  const [editingListing, setEditingListing] = useState(null);
  const [filters, setFilters] = useState({
    q: '',
    faculty: '',
    faculties: [],
    category: '',
    min: '',
    max: '',
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);

  const user = session?.user ?? null;
  const isAdmin = profile?.role === 'admin';
  const isSeller = profile?.role === 'seller' || isAdmin;

  function notify(message, type = 'success', context = '') {
    setNotice({ message: getErrorMessage(message, context), type });
  }

  useEffect(() => {
    if (!notice) return undefined;
    const timer = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(timer);
  }, [notice]);

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
    if (!isSupabaseConfigured) {
      setFaculties(DEMO_FACULTIES);
      setCategories(DEMO_CATEGORIES);
      return;
    }
    const [{ data: facultyData }, { data: categoryData }] = await Promise.all([
      supabase.from('faculties').select('*').eq('is_active', true).order('name'),
      supabase.from('categories').select('*').eq('is_active', true).order('name'),
    ]);
    setFaculties(facultyData?.length ? facultyData : DEMO_FACULTIES);
    setCategories(categoryData?.length ? categoryData : DEMO_CATEGORIES);
  }

  async function loadProfile(userId) {
    const { data, error } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
    if (error) {
      notify(error, 'error');
      return;
    }
    if (!data && user) {
      const { data: created, error: createError } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name ?? '',
          whatsapp: user.user_metadata?.whatsapp ?? '',
          role: user.user_metadata?.role === 'seller' ? 'seller' : 'user',
        })
        .select()
        .single();
      if (createError) {
        notify(createError, 'error');
        return;
      }
      setProfile(created);
      return;
    }
    setProfile(data);
  }

  async function loadListings() {
    if (!isSupabaseConfigured) {
      setListings(DEMO_LISTINGS);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('listings')
      .select(
        '*, faculty:faculties(*), category:categories(*), images:listing_images(*)',
      )
      .order('created_at', { ascending: false });

    if (error) {
      if (isMissingListingsError(error)) {
        setListings(DEMO_LISTINGS);
        setLoading(false);
        return;
      }
      notify(error, 'error');
      setListings(DEMO_LISTINGS);
      setLoading(false);
      return;
    }
    setListings(data?.length ? await hydrateListings(data) : DEMO_LISTINGS);
    setLoading(false);
  }

  async function hydrateListings(rawListings) {
    if (!rawListings?.length) return [];
    const sellerIds = [...new Set(rawListings.map((listing) => listing.seller_id).filter(Boolean))];
    const listingIds = rawListings.map((listing) => listing.id).filter(Boolean);

    const [{ data: sellers }, { data: reviews }] = await Promise.all([
      sellerIds.length ? supabase.from('users').select('id, email, full_name, whatsapp, avatar_url').in('id', sellerIds) : { data: [] },
      listingIds.length ? supabase.from('listing_reviews').select('*').in('listing_id', listingIds).eq('status', 'visible') : { data: [] },
    ]);

    const sellerMap = new Map((sellers ?? []).map((seller) => [seller.id, seller]));
    const reviewsByListing = new Map();
    (reviews ?? []).forEach((review) => {
      const list = reviewsByListing.get(review.listing_id) ?? [];
      list.push(review);
      reviewsByListing.set(review.listing_id, list);
    });

    return rawListings.map((listing) => ({
      ...listing,
      seller: sellerMap.get(listing.seller_id) ?? listing.seller,
      reviews: reviewsByListing.get(listing.id) ?? listing.reviews ?? [],
    }));
  }

  function openFaculty(facultyId) {
    setSelectedFacultyId(facultyId);
    setFilters((current) => ({ ...current, faculty: facultyId, faculties: [facultyId] }));
    setView('faculty');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function saveReview(listing, rating, comment) {
    if (!user) {
      notify('Inicia sesion para dejar una resena.', 'error');
      return false;
    }
    if (listing.seller_id === user.id) {
      notify('No puedes calificar tu propia publicacion.', 'error');
      return false;
    }
    if (isSuspiciousReview(comment)) {
      notify('La resena debe ser real, clara y sin enlaces, spam o texto repetido.', 'error');
      return false;
    }

    const payload = {
      listing_id: listing.id,
      reviewer_id: user.id,
      seller_id: listing.seller_id,
      rating: Number(rating),
      comment: comment.trim(),
      status: 'visible',
    };
    const existingReviewId = getReviews(listing).find((review) => review.reviewer_id === user.id)?.id;
    const result = existingReviewId
      ? await supabase.from('listing_reviews').update(payload).eq('id', existingReviewId)
      : await supabase.from('listing_reviews').insert(payload);
    const { error } = result;
    if (error) {
      notify(error, 'error');
      return false;
    }
    notify('Resena publicada.', 'success');
    await loadListings();
    return true;
  }

  const visibleListings = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    const selectedFacultyIds = getSelectedFacultyIds(filters);
    return listings.filter((listing) => {
      const matchesSold = isAdmin || listing.status !== 'deleted';
      const matchesFaculty = selectedFacultyIds.length === 0 || selectedFacultyIds.includes(listing.faculty_id);
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
    if (error) return notify(error, 'error');
    notify('Publicacion eliminada.', 'success');
    await loadListings();
  }

  async function markSold(id) {
    const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', id);
    if (error) return notify(error, 'error');
    notify('Marcada como vendida.', 'success');
    await loadListings();
  }

  async function blockUser(id) {
    const { error } = await supabase.from('users').update({ is_blocked: true }).eq('id', id);
    if (error) return notify(error, 'error');
    notify('Usuario bloqueado.', 'success');
    await loadListings();
  }

  return (
    <div className="min-h-screen pb-24 text-ink md:pb-10">
      <PromoTicker />
      <Header user={user} profile={profile} view={view} onNavigate={setView} isAdmin={isAdmin} isSeller={isSeller} />

      {notice && (
        <button
          className={cx(
            'fixed left-1/2 top-5 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-[28px] border px-5 py-4 text-center text-sm font-black text-white shadow-ios backdrop-blur-2xl',
            notice.type === 'error' ? 'border-red-300/40 bg-red-600/95' : 'border-emerald-300/40 bg-emerald-600/95',
          )}
          onClick={() => setNotice(null)}
        >
          {notice.message}
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
              onOpenFaculty={openFaculty}
              setView={setView}
            />
          )}

          {view === 'faculty' && (
            <FacultyMarket
              facultyId={selectedFacultyId || filters.faculty}
              faculties={faculties}
              listings={listings.filter((listing) => listing.status !== 'deleted')}
              onBack={() => setView('explore')}
              onOpen={setSelectedListing}
            />
          )}

          {view === 'create' && (
            <RequireSeller user={user} isSeller={isSeller} setView={setView}>
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
                setNotice={notify}
              />
            </RequireSeller>
          )}

          {view === 'mine' && (
            <RequireSeller user={user} isSeller={isSeller} setView={setView}>
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
            </RequireSeller>
          )}

          {view === 'profile' && (
            <Profile
              user={user}
              profile={profile}
              onSaved={() => user && loadProfile(user.id)}
              onSignOut={signOut}
              setNotice={notify}
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
                setNotice={notify}
              />
            </RequireAuth>
          )}

          {view.startsWith('info-') && (
            <InfoPage
              page={INFO_PAGES[view.replace('info-', '')] ?? INFO_PAGES.about}
              onBack={() => setView('explore')}
            />
          )}
        </section>
      </main>

      {isSeller && (
        <button
          className="fixed bottom-24 right-5 z-30 grid h-14 w-14 place-items-center rounded-full border border-white/20 bg-white/10 text-3xl font-light text-white shadow-ios backdrop-blur-2xl md:hidden"
          onClick={() => setView(user ? 'create' : 'profile')}
          aria-label="Crear publicacion"
        >
          +
        </button>
      )}

      <MobileNav view={view} setView={setView} isAdmin={isAdmin} isSeller={isSeller} />

      {selectedListing && (
        <ListingDetail
          listing={selectedListing}
          canManage={isAdmin || selectedListing.seller_id === user?.id}
          onClose={() => setSelectedListing(null)}
          onDelete={deleteListing}
          onSold={markSold}
          user={user}
          onReview={saveReview}
        />
      )}
    </div>
  );
}

function PromoTicker() {
  const text = 'Publica gratis en Phasvy Campus - Vendedores destacados esta semana: Cafe FIME, Postres FACPyA, Tacos FACDyC - Compra dentro de la UANL sin envios ni pagos en linea';
  return (
    <div className="overflow-hidden border-b border-orange-300/20 bg-orange-600 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
      <div className="ticker-track whitespace-nowrap">
        <span className="mx-8">{text}</span>
        <span className="mx-8">{text}</span>
      </div>
    </div>
  );
}

function Header({ user, profile, view, onNavigate, isAdmin, isSeller }) {
  const items = getNavigationItems(isSeller, isAdmin);
  const displayName = user ? profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Perfil' : 'Invitado';
  const avatar = profile?.avatar_url;

  return (
    <header className="sticky top-0 z-20 px-3 py-3 md:px-6">
      <div className="liquid mx-auto grid max-w-7xl gap-3 rounded-[28px] px-3 py-3 md:grid-cols-[minmax(190px,0.75fr)_auto_minmax(190px,0.75fr)] md:items-center">
        <button
          className="flex min-w-0 items-center gap-3 rounded-3xl px-2 py-1 text-left transition hover:bg-white/10"
          onClick={() => onNavigate(user ? 'profile' : 'profile')}
        >
          <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-white text-sm font-black text-ink">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : displayName.slice(0, 1).toUpperCase()}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black">{displayName}</span>
            <span className="block truncate text-xs font-semibold text-slate-500">{user ? 'Cuenta activa' : 'Iniciar sesion'}</span>
          </span>
        </button>

        <nav className="hidden rounded-3xl bg-orange-50 p-1 md:flex md:w-auto">
          {items.map((item) => (
            <button
              key={item.id}
              className={cx(
                'rounded-2xl px-3 py-2 text-xs font-black transition md:px-4',
                view === item.id ? 'bg-campus text-white shadow-soft' : 'text-slate-600 hover:bg-white hover:text-campus',
              )}
              onClick={() => onNavigate(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="hidden justify-self-end rounded-3xl border border-white/20 bg-white px-4 py-3 text-sm font-black text-ink shadow-soft transition active:scale-[0.98] md:inline-flex" onClick={() => onNavigate(isSeller ? 'create' : 'explore')}>
          {isSeller ? 'Publicar' : 'Ver publicaciones'}
        </button>

        <button className="absolute right-5 top-5 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-campus md:hidden" onClick={() => onNavigate('explore')}>
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

function MobileNav({ view, setView, isAdmin, isSeller }) {
  const items = getNavigationItems(isSeller, isAdmin);
  return (
    <nav className="safe-bottom fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 md:hidden">
      <div className={cx('liquid mx-auto grid max-w-md gap-1 rounded-[26px] p-1.5', items.length === 5 ? 'grid-cols-5' : items.length === 4 ? 'grid-cols-4' : 'grid-cols-2')}>
        {items.map((item) => (
          <button
            key={item.id}
            className={cx('rounded-2xl px-2 py-2 text-xs font-black transition', view === item.id ? 'bg-campus text-white' : 'text-slate-500')}
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

function Explore({ loading, listings, filters, setFilters, faculties, categories, onOpen, onOpenFaculty, setView }) {
  const sellerCount = new Set(listings.map((listing) => listing.seller_id)).size;
  const jumpToListings = () => window.setTimeout(() => document.getElementById('listings-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);

  return (
    <div className="space-y-5">
      <FacultyTags faculties={faculties} selectedFaculty={filters.faculty} onOpenFaculty={onOpenFaculty} />
      <HeroCarousel onVisit={jumpToListings} />
      <FeaturedCategories categories={categories} setFilters={setFilters} onSelect={jumpToListings} />
      <Filters filters={filters} setFilters={setFilters} faculties={faculties} categories={categories} />

      <div id="listings-section" className="scroll-mt-28" />
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
      <SellerJoin sellerCount={sellerCount} listingCount={listings.length} setView={setView} setFilters={setFilters} />
    </div>
  );
}

function HeroCarousel({ onVisit }) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActive((current) => (current + 1) % HERO_SLIDES.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, []);

  const slide = HERO_SLIDES[active];

  return (
    <div className="hero-shell mx-auto max-w-6xl overflow-hidden rounded-[18px] bg-white shadow-[0_28px_80px_rgba(15,23,42,0.16)]">
      <div className="relative min-h-[28rem] overflow-hidden bg-slate-200 md:min-h-[36rem]">
        <img src={slide.image} alt="" className="absolute inset-0 h-full w-full object-cover transition" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/58 via-black/16 to-transparent" />
        <div className="absolute left-5 top-6 rounded-full bg-white/90 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-orange-700 shadow-soft md:left-8">
          {slide.faculty}
        </div>
        <div className="absolute bottom-16 left-5 max-w-xl text-white md:bottom-20 md:left-10">
          <h1 className="inline bg-orange-500/82 px-3 py-1 text-4xl font-black leading-tight tracking-tight md:text-6xl">
            {slide.title}
          </h1>
          <p className="mt-5 max-w-lg text-xl font-semibold leading-8 drop-shadow md:text-2xl">{slide.text}</p>
          <button className="mt-6 rounded-full bg-orange-500 px-10 py-3 text-sm font-black text-white shadow-ios transition hover:bg-orange-600" onClick={onVisit}>
            Visitar tiendas
          </button>
        </div>
        <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
          {HERO_SLIDES.map((item, index) => (
            <button
              key={item.title}
              className={cx('h-3 rounded-full transition', index === active ? 'w-9 bg-white' : 'w-3 bg-white/50')}
              type="button"
              aria-label={`Ver slide ${index + 1}`}
              onClick={() => setActive(index)}
            />
          ))}
        </div>
      </div>
      <p className="px-4 py-3 text-center text-xs font-bold text-slate-500">
        Fotos del hero en <span className="font-black text-campus">public/campus/</span>. Reemplaza los SVG por fotos reales manteniendo los nombres.
      </p>
    </div>
  );
}

function FeaturedCategories({ categories, setFilters, onSelect }) {
  const cards = FEATURED_CATEGORIES.map((item) => ({
    ...item,
    category: categories.find((category) => category.name.toLowerCase() === item.name.toLowerCase()),
  }));

  return (
    <div className="mx-auto grid max-w-6xl gap-8 py-12 md:grid-cols-3">
      {cards.map(({ title, text, category, image }) => (
        <button
          key={title}
          className="group overflow-hidden rounded-[16px] bg-[#eeeeF4] p-6 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-ios"
          type="button"
          onClick={() => {
            if (!category) return;
            setFilters((current) => ({ ...current, category: category.id }));
            onSelect();
          }}
        >
          <div className="flex h-72 items-center justify-center">
            <img src={image} alt="" className="max-h-full w-full object-contain transition group-hover:scale-105" />
          </div>
          <div className="px-2 pb-3 pt-4">
            <h3 className="text-2xl font-black text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            <span className="mt-6 inline-block text-sm font-bold text-red-600 underline">Ver categoria</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function FacultyTags({ faculties, selectedFaculty, onOpenFaculty }) {
  const tags = QUICK_FACULTIES.map((name) => {
    const aliases = name === 'FAPSI' ? ['FAPSI', 'Psicologia'] : [name];
    return {
      name,
      faculty: faculties.find((faculty) => aliases.some((alias) => faculty.name.toLowerCase() === alias.toLowerCase())),
    };
  }).filter((item) => item.faculty);

  return (
    <div className="mx-auto max-w-6xl rounded-[24px] bg-white/88 px-4 py-5 shadow-soft backdrop-blur-xl">
      <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">Explora por facultad</p>
      <div className="flex flex-wrap justify-center gap-3">
        {tags.map(({ name, faculty }) => {
          const brand = FACULTY_BRANDS[name] ?? { color: '#f97316', logo: '/faculties/uanl.svg' };
          return (
            <button
              key={name}
              className={cx(
                'flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5',
                selectedFaculty === faculty.id ? 'ring-4 ring-orange-200' : '',
              )}
              style={{ borderColor: `${brand.color}55`, color: brand.color }}
              type="button"
              onClick={() => onOpenFaculty(faculty.id)}
            >
              <img src={brand.logo} alt="" className="h-7 w-7 rounded-full object-contain" />
              {name}
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs font-semibold text-slate-500">
        Logos en <span className="font-black text-campus">public/faculties/</span>. Puedes cambiarlos por los oficiales manteniendo el nombre del archivo.
      </p>
    </div>
  );
}

function Filters({ filters, setFilters, faculties, categories }) {
  const update = (key, value) => setFilters((current) => ({ ...current, [key]: value }));
  const selectedFacultyIds = getSelectedFacultyIds(filters);
  const setSelectedFaculties = (ids) => setFilters((current) => ({ ...current, faculty: ids[0] ?? '', faculties: ids }));
  const toggleFaculty = (facultyId) => {
    const nextIds = selectedFacultyIds.includes(facultyId)
      ? selectedFacultyIds.filter((id) => id !== facultyId)
      : [...selectedFacultyIds, facultyId];
    setSelectedFaculties(nextIds);
  };
  const applyCampus = (campus) => {
    const ids = getFacultyIdsByNames(faculties, campus.names);
    setSelectedFaculties(ids);
  };
  const quickFaculties = QUICK_FACULTIES.map((name) => {
    const aliases = name === 'FAPSI' ? ['FAPSI', 'Psicologia'] : [name];
    return {
      name,
      faculty: faculties.find((faculty) => aliases.some((alias) => faculty.name.toLowerCase() === alias.toLowerCase())),
    };
  }).filter((item) => item.faculty);

  return (
    <div className="panel mx-auto max-w-6xl space-y-3 p-4">
      {quickFaculties.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          <button
            className={cx('chip', selectedFacultyIds.length === 0 && 'chip-active')}
            type="button"
            onClick={() => setSelectedFaculties([])}
          >
            Todas
          </button>
          {CAMPUS_GROUPS.map((campus) => {
            const ids = getFacultyIdsByNames(faculties, campus.names);
            const isActive = ids.length > 0 && ids.every((id) => selectedFacultyIds.includes(id));
            return (
              <button
                key={campus.id}
                className={cx('chip', isActive && 'chip-active')}
                type="button"
                onClick={() => applyCampus(campus)}
              >
                {campus.label}
              </button>
            );
          })}
          {quickFaculties.map(({ name, faculty }) => (
            <button
              key={faculty.id}
              className={cx('chip', selectedFacultyIds.includes(faculty.id) && 'chip-active')}
              type="button"
              onClick={() => toggleFaculty(faculty.id)}
            >
              {name}
            </button>
          ))}
        </div>
      )}
      <input className="field" placeholder="Buscar libros, calculadora, comida, asesorias..." value={filters.q} onChange={(event) => update('q', event.target.value)} />
      <div className="grid gap-3 md:grid-cols-[1.1fr_1.1fr_0.8fr_0.8fr]">
        <select className="field" value={selectedFacultyIds[0] ?? ''} onChange={(event) => setSelectedFaculties(event.target.value ? [event.target.value] : [])}>
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

function FacultyMarket({ facultyId, faculties, listings, onBack, onOpen }) {
  const faculty = faculties.find((item) => item.id === facultyId);
  const facultyListings = listings.filter((listing) => !facultyId || listing.faculty_id === facultyId);
  const topSellers = getTopSellers(facultyListings);
  const brand = FACULTY_BRANDS[faculty?.name] ?? { color: '#f97316', logo: '/faculties/uanl.svg' };

  return (
    <div className="space-y-5">
      <section className="dark-panel overflow-hidden p-5 md:p-7">
        <button className="secondary-btn !border-white/10 !bg-white/10 !text-white" onClick={onBack}>
          Volver
        </button>
        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">Explorar por facultad</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-6xl">{faculty?.name ?? 'UANL'}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/60">
              Todas las publicaciones activas de esta facultad, con vendedores destacados por calificacion y resenas reales.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-[22px] bg-white/10 p-3">
            <img src={brand.logo} alt="" className="h-14 w-14 rounded-full bg-white object-contain p-1" />
            <div>
              <p className="text-3xl font-black">{facultyListings.length}</p>
              <p className="text-xs font-bold text-white/60">publicaciones</p>
            </div>
          </div>
        </div>
      </section>

      <section className="panel p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="label">Top vendedores</p>
            <h2 className="text-2xl font-black">Mejor calificados</h2>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-campus">Top 5</span>
        </div>
        {topSellers.length === 0 ? (
          <p className="rounded-3xl bg-orange-50 p-4 text-sm font-bold text-orange-900">Todavia no hay vendedores con publicaciones en esta facultad.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-5">
            {topSellers.map((item, index) => (
              <div key={item.id} className="rounded-[22px] border border-orange-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-campus text-sm font-black text-white">#{index + 1}</span>
                  <RatingBadge rating={item.rating} count={item.reviewCount} compact />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-black">{item.seller?.full_name ?? 'Vendedor UANL'}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.listingCount} publicaciones activas</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {facultyListings.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-black">No hay publicaciones en esta facultad.</p>
          <p className="mt-1 text-sm text-slate-500">Cuando alguien publique aqui apareceran en esta ventana.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {facultyListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onOpen={() => onOpen(listing)} />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerJoin({ sellerCount, listingCount, setView, setFilters }) {
  const go = (nextView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const visitStores = () => {
    setFilters((current) => ({ ...current, faculty: '', faculties: [], category: '', q: '', min: '', max: '' }));
    go('explore');
  };

  return (
    <section
      className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-[18px] bg-[#f3f3f3] text-center shadow-soft"
      onClick={(event) => {
        if (event.target.tagName !== 'BUTTON') return;
        const text = event.target.textContent.toLowerCase();
        if (text.includes('quiero')) go('create');
        if (text.includes('inicio')) go('explore');
        if (text.includes('quienes')) go('info-about');
        if (text.includes('tiendas')) visitStores();
        if (text.includes('cuenta')) go('info-account');
        if (text.includes('privacidad')) go('info-privacy');
        if (text.includes('terminos')) go('info-terms');
        if (text.includes('contacto')) go('info-contact');
        if (text.includes('cookie')) go('info-cookies');
      }}
    >
      <div className="px-6 pb-8 pt-12">
        <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-4xl">¿Como puedo unirme a Phasvy?</h2>
        <p className="mx-auto mt-5 max-w-2xl text-sm leading-6 text-slate-600">
          Unete como vendedor. Publica tus productos, administra tus anuncios y contacta compradores dentro de la UANL sin pagos en linea ni envios.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button className="rounded-md bg-slate-500 px-8 py-3 text-sm font-black text-white transition hover:bg-slate-700">
            Quiero ser parte
          </button>
          <div className="rounded-md bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
            {sellerCount} vendedores demo
          </div>
          <div className="rounded-md bg-white px-5 py-3 text-sm font-black text-slate-700 shadow-sm">
            {listingCount} publicaciones
          </div>
        </div>
      </div>
      <img src="/campus/footer-campus.svg" alt="" className="h-80 w-full object-cover object-bottom" />
      <div className="grid gap-8 bg-[#282828] px-6 py-8 text-left text-white md:grid-cols-2 md:px-20">
        <div>
          <h3 className="text-2xl font-black">Enlaces</h3>
          <div className="mt-5 grid gap-3 text-sm font-semibold">
            <button className="text-left">Inicio</button>
            <button className="text-left">¿Quienes somos?</button>
            <button className="text-left">Visita las tiendas</button>
            <button className="text-left">Detalles de tu cuenta</button>
          </div>
        </div>
        <div>
          <h3 className="text-2xl font-black">Importantes</h3>
          <div className="mt-5 grid gap-3 text-sm font-semibold">
            <button className="text-left">Politica de privacidad</button>
            <button className="text-left">Terminos y condiciones</button>
            <button className="text-left">Contacto</button>
            <button className="text-left">Cookie Policy</button>
          </div>
        </div>
      </div>
      <button
        className="fixed bottom-24 right-5 z-30 hidden h-12 w-12 place-items-center rounded-md bg-red-600 text-2xl font-black text-white shadow-ios md:grid"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver arriba"
      >
        ↑
      </button>
    </section>
  );
}

function ListingCard({ listing, onOpen }) {
  const cover = listing.images?.[0]?.url;
  const rating = getListingRating(listing);
  const reviewCount = getReviews(listing).length || listing.reviews_count || 0;
  const sellerStats = getSellerStats([listing], listing.seller_id);
  return (
    <button className="panel overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-ios" onClick={onOpen}>
      <div className="aspect-[4/3] bg-slate-100 p-2">
        <div className="h-full overflow-hidden rounded-[22px] bg-slate-200">
          {cover ? <img src={cover} alt={listing.title} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-4xl text-slate-300">+</div>}
        </div>
      </div>
      <div className="space-y-3 p-4 pt-2">
        <div className="flex items-center justify-between gap-2">
          <RatingBadge rating={rating} count={reviewCount} />
          <RatingBadge rating={sellerStats.rating} count={sellerStats.reviewCount} label="Vendedor" compact />
        </div>
        <h2 className="line-clamp-2 text-lg font-black leading-tight">{listing.title}</h2>
        <p className="line-clamp-2 text-sm text-slate-500">{listing.description}</p>
        <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-black text-slate-500">{listing.faculty?.name ?? 'Campus'}</p>
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

function RatingBadge({ rating, count, label = 'Producto', compact = false }) {
  const cleanRating = Number(rating || 0);
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full bg-orange-100 text-campus', compact ? 'px-2 py-1 text-[11px] font-black' : 'px-3 py-1.5 text-xs font-black')}>
      <span aria-hidden="true">★</span>
      {cleanRating ? cleanRating.toFixed(1) : 'Nuevo'}
      {!compact && <span className="text-orange-700/70">{label}</span>}
      {count ? <span className="text-orange-700/70">({count})</span> : null}
    </span>
  );
}

function ListingDetail({ listing, canManage, onClose, onDelete, onSold, user, onReview }) {
  const coverImages = listing.images?.length ? listing.images : [{ url: '' }];
  const phone = normalizePhone(listing.whatsapp || listing.seller?.whatsapp || '');
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola, vi tu publicacion "${listing.title}" en Phasvy Campus.`)}` : '';
  const reviews = getReviews(listing);
  const productRating = getListingRating(listing);
  const sellerStats = getSellerStats([listing], listing.seller_id);

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
            <div className="flex flex-wrap gap-2">
              <RatingBadge rating={productRating} count={reviews.length || listing.reviews_count || 0} />
              <RatingBadge rating={sellerStats.rating} count={sellerStats.reviewCount} label="Vendedor" />
            </div>
            <p className="whitespace-pre-wrap text-slate-600">{listing.description}</p>
            <div className="rounded-2xl bg-slate-50 p-4 text-sm">
              <p className="font-black">{listing.seller?.full_name ?? 'Vendedor UANL'}</p>
              <p className="text-slate-500">{listing.contact_note || 'Acuerda entrega dentro del campus. No hay pagos en linea ni envios en esta version.'}</p>
            </div>
            <ReviewSection listing={listing} reviews={reviews} user={user} onReview={onReview} />
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

function ReviewSection({ listing, reviews, user, onReview }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const userReview = reviews.find((review) => review.reviewer_id === user?.id);

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    const saved = await onReview(listing, rating, comment);
    setSaving(false);
    if (saved) setComment('');
  }

  return (
    <div className="space-y-3 rounded-[24px] border border-orange-100 bg-orange-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="label">Resenas</p>
          <h3 className="font-black">Opiniones del producto</h3>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-campus">{reviews.length} visibles</span>
      </div>

      {reviews.length === 0 ? (
        <p className="rounded-2xl bg-white p-3 text-sm font-semibold text-slate-500">Todavia no hay resenas. Se el primero en calificar con una opinion real.</p>
      ) : (
        <div className="max-h-48 space-y-2 overflow-y-auto pr-1">
          {reviews.slice(0, 6).map((review) => (
            <div key={review.id ?? `${review.reviewer_id}-${review.created_at}`} className="rounded-2xl bg-white p-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-black text-campus">★ {Number(review.rating).toFixed(1)}</span>
                <span className="text-xs font-semibold text-slate-400">{review.created_at ? new Date(review.created_at).toLocaleDateString('es-MX') : 'Demo'}</span>
              </div>
              <p className="mt-1 text-slate-600">{review.comment}</p>
            </div>
          ))}
        </div>
      )}

      {user ? (
        <form className="space-y-2 border-t border-orange-100 pt-3" onSubmit={submit}>
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <select className="field" value={rating} onChange={(event) => setRating(event.target.value)}>
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} ★</option>)}
            </select>
            <input
              className="field"
              minLength="12"
              maxLength="360"
              required
              placeholder={userReview ? 'Actualiza tu resena' : 'Escribe una resena real y util'}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
          <button className="secondary-btn w-full" disabled={saving}>{saving ? 'Guardando...' : userReview ? 'Actualizar resena' : 'Publicar resena'}</button>
        </form>
      ) : (
        <p className="border-t border-orange-100 pt-3 text-xs font-bold text-slate-500">Inicia sesion para dejar una resena. No se permiten enlaces, spam ni resenas falsas.</p>
      )}
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

function RequireSeller({ user, isSeller, setView, children }) {
  if (!user) return <RequireAuth user={user} setView={setView}>{children}</RequireAuth>;
  if (isSeller) return children;
  return (
    <div className="panel mx-auto max-w-xl p-8 text-center">
      <p className="label">Cuenta cliente</p>
      <h2 className="mt-2 text-2xl font-black">Esta seccion es para vendedores.</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Entra como vendedor desde el login o perfil para publicar y gestionar tus productos.</p>
      <button className="primary-btn mt-5" onClick={() => setView('explore')}>Ver publicaciones</button>
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
    if (form.description.trim().length < 10) {
      setNotice('La descripcion debe tener al menos 10 caracteres.', 'error');
      return;
    }
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
      return setNotice(result.error, 'error');
    }

    for (const file of files) {
      const path = `${user.id}/${result.data.id}/${Date.now()}-${file.name}`;
      const upload = await supabase.storage.from('listing-images').upload(path, file, { upsert: false });
      if (upload.error) {
        setNotice(upload.error, 'error');
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
    setNotice(editing?.id ? 'Publicacion actualizada.' : 'Publicacion creada.', 'success');
    onDone();
  }

  return (
    <form className="panel mx-auto max-w-3xl space-y-4 p-4 md:p-6" onSubmit={saveListing}>
      <div>
        <p className="label">{editing ? 'Editar publicacion' : 'Nueva publicacion'}</p>
        <h1 className="mt-2 text-3xl font-black">Publica para tu facultad</h1>
      </div>
      <input className="field" required placeholder="Titulo" value={form.title} onChange={(event) => update('title', event.target.value)} />
      <textarea className="field min-h-32" required minLength="10" placeholder="Descripcion, estado, punto de entrega..." value={form.description} onChange={(event) => update('description', event.target.value)} />
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
      <div className="dark-panel p-5">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-orange-200">Panel vendedor</p>
        <h1 className="mt-1 text-3xl font-black text-white">Mis publicaciones</h1>
      </div>
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

function InfoPage({ page, onBack }) {
  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <section className="dark-panel p-6 md:p-8">
        <button className="secondary-btn !border-white/10 !bg-white/10 !text-white" onClick={onBack}>
          Volver al inicio
        </button>
        <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-orange-200">{page.eyebrow}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{page.title}</h1>
      </section>
      <section className="panel space-y-4 p-5 md:p-7">
        {page.body.map((paragraph) => (
          <p key={paragraph} className="text-base leading-8 text-slate-600">{paragraph}</p>
        ))}
      </section>
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
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phoneCode, setPhoneCode] = useState('52');
  const [phone, setPhone] = useState('');
  const [accountRole, setAccountRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showMailHelp, setShowMailHelp] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const normalizedPhone = phone.replace(/\D/g, '');
    if (mode === 'signup' && password !== confirmPassword) {
      setNotice('Las contrasenas no coinciden.', 'error');
      return;
    }
    if (mode === 'signup' && normalizedPhone.length !== 10) {
      setNotice('El telefono debe tener exactamente 10 digitos.', 'error');
      return;
    }
    setSaving(true);
    let result;
    try {
      result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { data: { full_name: fullName, whatsapp: `${phoneCode}${normalizedPhone}`, role: accountRole } },
            });
    } catch (error) {
      setSaving(false);
      setNotice(error, 'error', mode);
      return;
    }
    setSaving(false);
    if (result.error) return setNotice(result.error, 'error', mode);
    if (result.data?.user) {
      const profilePayload = {
        id: result.data.user.id,
        email: result.data.user.email ?? email,
        role: accountRole,
      };
      if (mode === 'signup') {
        profilePayload.full_name = fullName;
        profilePayload.whatsapp = `${phoneCode}${normalizedPhone}`;
      }
      await supabase.from('users').upsert(profilePayload);
    }
    if (mode === 'signup') {
      if (result.data?.session) {
        setNotice(accountRole === 'seller' ? 'Cuenta de vendedor creada.' : 'Cuenta de cliente creada.', 'success');
        return;
      }
      setVerificationSent(true);
      setShowMailHelp(false);
      return;
    }
    setNotice('Sesion iniciada.', 'success');
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
              let result;
              try {
                result = await supabase.auth.signInWithPassword({ email, password });
              } catch (error) {
                setNotice(error, 'error', 'login');
                return;
              }
              if (result.error) {
                setNotice(result.error, 'error', 'login');
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
        <div className="grid grid-cols-2 gap-2 rounded-3xl bg-orange-50 p-1">
          <button type="button" className={cx('rounded-2xl py-3 text-sm font-black transition', accountRole === 'user' && 'bg-white text-campus shadow-soft')} onClick={() => setAccountRole('user')}>Cliente</button>
          <button type="button" className={cx('rounded-2xl py-3 text-sm font-black transition', accountRole === 'seller' && 'bg-white text-campus shadow-soft')} onClick={() => setAccountRole('seller')}>Vendedor</button>
        </div>
        {mode === 'signup' && (
          <>
            <input className="field" required placeholder="Nombre completo" value={fullName} onChange={(event) => setFullName(event.target.value)} />
            <div className="grid grid-cols-[8.5rem_1fr] gap-2">
              <select className="field" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} aria-label="Lada">
                {PHONE_CODES.map((code) => (
                  <option key={`${code.country}-${code.value}`} value={code.value}>
                    {code.label}
                  </option>
                ))}
              </select>
              <input
                className="field"
                required
                inputMode="numeric"
                maxLength="10"
                placeholder="WhatsApp 10 digitos"
                value={phone}
                onChange={(event) => setPhone(event.target.value.replace(/\D/g, '').slice(0, 10))}
              />
            </div>
          </>
        )}
        <input className="field" required type="email" placeholder="Correo UANL o personal" value={email} onChange={(event) => setEmail(event.target.value)} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input className="field" required type={showPassword ? 'text' : 'password'} minLength="6" placeholder="Password" value={password} onChange={(event) => setPassword(event.target.value)} />
          <button className="secondary-btn !px-4" type="button" onClick={() => setShowPassword((current) => !current)}>
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {mode === 'signup' && (
          <input
            className="field"
            required
            type={showPassword ? 'text' : 'password'}
            minLength="6"
            placeholder="Repetir password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        )}
        <button className="primary-btn w-full" disabled={saving}>{saving ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
    </div>
  );
}

function ProfileForm({ user, profile, onSaved, onSignOut, setNotice }) {
  const [form, setForm] = useState({ full_name: '', whatsapp: '', faculty_id: '', avatar_url: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? '',
      whatsapp: profile?.whatsapp ?? user.user_metadata?.whatsapp ?? '',
      faculty_id: profile?.faculty_id ?? '',
      avatar_url: profile?.avatar_url ?? '',
    });
  }, [profile?.id, user.id]);

  async function uploadAvatar(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setNotice('Solo se permiten imagenes para la foto de perfil.', 'error');
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setNotice('La foto de perfil debe pesar menos de 2 MB.', 'error');
      return;
    }

    setUploadingAvatar(true);
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${user.id}/avatar-${Date.now()}.${extension}`;
    const upload = await supabase.storage.from('avatars').upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    });

    if (upload.error) {
      setUploadingAvatar(false);
      setNotice(upload.error, 'error');
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    setForm((current) => ({ ...current, avatar_url: data.publicUrl }));
    setUploadingAvatar(false);
    setNotice('Foto lista. Guarda el perfil para aplicar el cambio.', 'success');
  }

  async function save(event) {
    event.preventDefault();
    const { error } = await supabase.from('users').upsert({
      id: user.id,
      email: user.email,
      full_name: form.full_name,
      whatsapp: form.whatsapp,
      faculty_id: form.faculty_id || null,
      avatar_url: form.avatar_url || null,
    });
    if (error) return setNotice(error, 'error');
    setNotice('Perfil guardado.', 'success');
    onSaved();
  }

  return (
    <form className="panel mx-auto max-w-xl space-y-4 p-5" onSubmit={save}>
      <div>
        <p className="label">Perfil</p>
        <h1 className="mt-2 text-3xl font-black">{profile?.full_name || user.email}</h1>
      </div>
      <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-4">
        <div className="grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-2xl font-black text-white">
          {form.avatar_url ? <img src={form.avatar_url} alt="" className="h-full w-full object-cover" /> : (form.full_name || user.email || 'P').slice(0, 1).toUpperCase()}
        </div>
        <label className="secondary-btn cursor-pointer">
          {uploadingAvatar ? 'Subiendo...' : 'Cambiar foto'}
          <input
            className="sr-only"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={uploadingAvatar}
            onChange={(event) => uploadAvatar(event.target.files?.[0])}
          />
        </label>
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
    if (error) return setNotice(error, 'error');
    setName('');
    await reload();
  }
  async function toggle(item) {
    const { error } = await supabase.from(table).update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) return setNotice(error, 'error');
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
