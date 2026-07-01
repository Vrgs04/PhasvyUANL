import { useEffect, useMemo, useRef, useState } from 'react';
import { EMPTY_LISTING } from './data/defaults.js';
import { DEMO_CATEGORIES, DEMO_FACULTIES, DEMO_LISTINGS } from './data/demo.js';
import { isSupabaseConfigured, supabase } from './lib/supabase.js';

const currency = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
  maximumFractionDigits: 0,
});

const navItems = [
  { id: 'explore', label: 'Home', icon: 'home' },
  { id: 'catalog', label: 'Explorar', icon: 'grid' },
  { id: 'profile', label: 'Perfil', icon: 'user' },
];
const sellerNavItems = [
  { id: 'explore', label: 'Home', icon: 'home' },
  { id: 'catalog', label: 'Explorar', icon: 'grid' },
  { id: 'create', label: 'Publicar', icon: 'plus' },
  { id: 'mine', label: 'Mias', icon: 'bag' },
  { id: 'profile', label: 'Perfil', icon: 'user' },
];

const QUICK_FACULTIES = ['FIME', 'FACPyA', 'FACDyC', 'Medicina', 'FAPSI', 'FARQ', 'Odontologia', 'FCQ'];
const CAMPUS_GROUPS = [
  { id: 'cu', label: 'Ciudad Universitaria', shortLabel: 'CU', names: ['FIME', 'FACPyA', 'FACDyC', 'FCQ', 'FCFM', 'Ciencias Biologicas'], image: '/campus/campus-cu.jpg', logo: '/faculties/uanl.jpg' },
  { id: 'agro', label: 'Agropecuarias', names: ['Agronomia', 'Medicina Veterinaria', 'Veterinaria'] },
  { id: 'salud', label: 'Medicina', shortLabel: 'Medicina', names: ['Medicina', 'Odontologia'], image: '/campus/campus-medicina.jpg', logo: '/faculties/medicina.jpg' },
  { id: 'mederos', label: 'Mederos', shortLabel: 'Mederos', names: ['FAPSI', 'FARQ', 'Filosofia y Letras'], image: '/campus/campus-mederos.jpg', logo: '/faculties/uanl.jpg' },
];
const FEATURED_CAMPUSES = CAMPUS_GROUPS.filter((campus) => campus.image);
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const MAX_LISTING_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_LISTING_IMAGES = 6;
const ALLOWED_EMAIL_DOMAINS = new Set(['gmail.com', 'hotmail.com', 'outlook.com', 'uanl.edu.mx', 'yahoo.com', 'icloud.com']);
const FACULTY_BRANDS = {
  FIME: { color: '#006b4f', logo: '/faculties/fime.jpg' },
  FACPyA: { color: '#0f5ea8', logo: '/faculties/facpya.jpg' },
  FACDyC: { color: '#7c2d12', logo: '/faculties/facdyc.jpg' },
  Medicina: { color: '#b91c1c', logo: '/faculties/medicina.jpg' },
  FAPSI: { color: '#7c3aed', logo: '/faculties/fapsi.jpg' },
  FARQ: { color: '#334155', logo: '/faculties/farq.jpg' },
  Odontologia: { color: '#0891b2', logo: '/faculties/odontologia.jpg' },
  FCQ: { color: '#15803d', logo: '/faculties/fcq.jpg' },
};
const FEATURED_CATEGORIES = [
  { name: 'Comidas', title: 'Comidas', text: 'Busca lo que estan vendiendo ahora mismo en tu facultad.', image: '/categories/comidas.jpg' },
  { name: 'Bebidas', title: 'Refrescos', text: 'Encuentra bebidas frias, aguas preparadas y cafe entre clases.', image: '/categories/refrescos.jpg' },
  { name: 'Postres', title: 'Pan de dulce', text: 'Antojos, brownies y postres hechos por alumnos.', image: '/categories/postres.jpg' },
];
const HERO_SLIDES = [
  { title: '¿Tienes hambre?', text: 'Encuentra productos que se estan vendiendo ahora mismo en FIME.', faculty: 'FIME', image: '/campus/hero-fime.jpg' },
  { title: 'Compra dentro de la UANL', text: 'Filtra por facultad y acuerda entrega directa por WhatsApp.', faculty: 'UANL', image: '/campus/hero-campus.jpg' },
  { title: 'Vende entre clases', text: 'Publica comida, bebidas, postres, libros o servicios en minutos.', faculty: 'Campus', image: '/campus/hero-vendedores.jpg' },
];
const PHONE_CODES = [
  { id: 'MX', label: '🇲🇽 +52', value: '52', country: 'Mexico' },
  { id: 'US', label: '🇺🇸 +1', value: '1', country: 'Estados Unidos' },
  { id: 'CA', label: '🇨🇦 +1', value: '1', country: 'Canada' },
  { id: 'CO', label: '🇨🇴 +57', value: '57', country: 'Colombia' },
  { id: 'AR', label: '🇦🇷 +54', value: '54', country: 'Argentina' },
  { id: 'CL', label: '🇨🇱 +56', value: '56', country: 'Chile' },
  { id: 'ES', label: '🇪🇸 +34', value: '34', country: 'Espana' },
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

function sanitizeSingleLine(value, maxLength = 500) {
  return String(value ?? '')
    .replace(/[\u0000-\u001F\u007F<>]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

function sanitizeMultiline(value, maxLength = 3000) {
  return String(value ?? '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F<>]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxLength);
}

function getEmailDomain(value) {
  return String(value ?? '').trim().toLowerCase().split('@').pop() ?? '';
}

function splitPhoneNumber(phone) {
  const normalized = normalizePhone(phone || '');
  const knownCodes = [...PHONE_CODES].sort((a, b) => b.value.length - a.value.length);
  const country = normalized.length > 10 ? knownCodes.find((item) => normalized.startsWith(item.value)) ?? PHONE_CODES[0] : PHONE_CODES[0];
  return { code: country.id, number: normalized.length > 10 ? normalized.slice(country.value.length, country.value.length + 10) : normalized.slice(0, 10) };
}

function getDialCode(countryId) {
  return PHONE_CODES.find((item) => item.id === countryId)?.value ?? '52';
}

function createEmptyFilters() {
  return { q: '', faculties: [], campuses: [], categories: [], min: '', max: '' };
}

function getReviews(listing) {
  return Array.isArray(listing.reviews)
    ? listing.reviews.filter((review) => !review.status || review.status === 'visible')
    : [];
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
  return isAdmin ? [...items, { id: 'admin', label: 'Admin', icon: 'shield' }] : items;
}

function NavIcon({ name }) {
  const paths = {
    home: <><path d="M3 10.8 12 3l9 7.8" /><path d="M5.5 9.5V21h13V9.5M9.5 21v-7h5v7" /></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>,
    plus: <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>,
    bag: <><path d="M5 8h14l-1 13H6L5 8Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></>,
    shield: <><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-4" /></>,
    bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></>,
  };
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      {paths[name] ?? paths.grid}
    </svg>
  );
}

function getFacultyIdsByNames(faculties, names) {
  return names
    .map((name) => faculties.find((faculty) => faculty.name.toLowerCase() === name.toLowerCase())?.id)
    .filter(Boolean);
}

function getSelectedFacultyIds(filters) {
  return filters.faculties ?? [];
}

function getListingFacultyIds(listing) {
  const ids = (listing.faculties ?? []).map((faculty) => faculty.id).filter(Boolean);
  if (listing.faculty_id && !ids.includes(listing.faculty_id)) ids.push(listing.faculty_id);
  return ids;
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
    return 'No existe el bucket de Storage. Ejecuta supabase/repair-current-project.sql en Supabase SQL Editor para crear los buckets de imagenes y avatares.';
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
  const [marketSelection, setMarketSelection] = useState(null);
  const [editingListing, setEditingListing] = useState(null);
  const [filters, setFilters] = useState(createEmptyFilters);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const realtimeRefreshTimer = useRef(null);

  const user = session?.user ?? null;
  const isAdmin = profile?.role === 'admin';
  const isSeller = (profile?.role === 'seller' && profile?.business_status === 'approved') || isAdmin;

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
  }, []);

  useEffect(() => {
    if (user) {
      loadProfile(user.id);
      loadListings();
      loadNotifications();
      return;
    }
    setProfile(null);
    setListings([]);
    setSelectedListing(null);
    setNotifications([]);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return undefined;
    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${user.id}` },
        ({ new: incoming }) => {
          setNotifications((current) => current.some((item) => item.id === incoming.id) ? current : [incoming, ...current]);
          notify(incoming.title || 'Tienes una nueva notificación.', 'success');
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(realtimeRefreshTimer.current);
      realtimeRefreshTimer.current = window.setTimeout(() => loadListings(), 250);
    };
    const channel = supabase
      .channel(`marketplace-live-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listings' }, (payload) => {
        const removedId = payload.old?.id;
        if (payload.eventType === 'DELETE' && removedId) {
          setListings((current) => current.filter((item) => item.id !== removedId));
          setSelectedListing((current) => current?.id === removedId ? null : current);
        } else if (payload.new?.status === 'deleted') {
          setListings((current) => current.filter((item) => item.id !== payload.new.id));
          setSelectedListing((current) => current?.id === payload.new.id ? null : current);
        }
        scheduleRefresh();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_images' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_faculties' }, scheduleRefresh)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_reviews' }, scheduleRefresh)
      .subscribe();
    return () => {
      window.clearTimeout(realtimeRefreshTimer.current);
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  async function loadNotifications() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) {
      if (!String(error.message ?? '').includes('notifications')) notify(error, 'error');
      return;
    }
    setNotifications(data ?? []);
  }

  async function markNotificationsRead(notificationId = null) {
    let query = supabase.from('notifications').update({ read_at: new Date().toISOString() }).is('read_at', null);
    if (notificationId) query = query.eq('id', notificationId);
    const { error } = await query;
    if (error) {
      notify(error, 'error');
      return;
    }
    setNotifications((current) => current.map((item) => (
      (!notificationId || item.id === notificationId) ? { ...item, read_at: item.read_at ?? new Date().toISOString() } : item
    )));
  }

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
          business_name: user.user_metadata?.business_name ?? '',
          business_description: user.user_metadata?.business_description ?? '',
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
        '*, faculty:faculties!listings_faculty_id_fkey(*), category:categories(*), images:listing_images(*), listing_faculties(faculty:faculties!listing_faculties_faculty_id_fkey(*))',
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
    const hydrated = await hydrateListings(data ?? []);
    setListings(hydrated);
    setSelectedListing((current) => current ? hydrated.find((listing) => listing.id === current.id) ?? null : current);
    setLoading(false);
  }

  async function hydrateListings(rawListings) {
    if (!rawListings?.length) return [];
    const sellerIds = [...new Set(rawListings.map((listing) => listing.seller_id).filter(Boolean))];
    const listingIds = rawListings.map((listing) => listing.id).filter(Boolean);

    const reviewQuery = listingIds.length
      ? supabase.from('listing_reviews').select('*').in('listing_id', listingIds)
      : null;
    const [sellerResult, { data: reviews }] = await Promise.all([
      sellerIds.length ? supabase.rpc('get_public_seller_profiles', { seller_ids: sellerIds }) : { data: [] },
      reviewQuery ? reviewQuery.or(`status.eq.visible,reviewer_id.eq.${user.id}`) : { data: [] },
    ]);
    let sellers = sellerResult.data ?? [];
    if (sellerResult.error && sellerIds.length) {
      const legacyResult = await supabase
        .from('users')
        .select('id, full_name, avatar_url, business_name, business_description')
        .in('id', sellerIds);
      sellers = legacyResult.data ?? [];
    }

    const sellerMap = new Map((sellers ?? []).map((seller) => [seller.id, seller]));
    const reviewsByListing = new Map();
    const userReviewsByListing = new Map();
    (reviews ?? []).forEach((review) => {
      if (review.status === 'visible') {
        const list = reviewsByListing.get(review.listing_id) ?? [];
        list.push(review);
        reviewsByListing.set(review.listing_id, list);
      }
      if (review.reviewer_id === user.id) userReviewsByListing.set(review.listing_id, review);
    });

    return rawListings.map((listing) => ({
      ...listing,
      seller: sellerMap.get(listing.seller_id) ?? listing.seller,
      images: [...(listing.images ?? [])].sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0)),
      faculties: (listing.listing_faculties ?? []).map((item) => item.faculty).filter(Boolean),
      reviews: reviewsByListing.get(listing.id) ?? listing.reviews ?? [],
      userReview: userReviewsByListing.get(listing.id) ?? null,
    }));
  }

  function openFaculty(facultyId) {
    setMarketSelection({ type: 'faculty', id: facultyId });
    setView('market');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function openCampus(campus) {
    setMarketSelection({ type: 'campus', id: campus.id });
    setView('market');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function navigate(nextView) {
    if (nextView === 'catalog') setFilters(createEmptyFilters());
    setView(nextView);
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
      comment: sanitizeMultiline(comment, 360),
      status: 'pending',
    };
    const existingReviewId = listing.userReview?.id
      ?? getReviews(listing).find((review) => review.reviewer_id === user.id)?.id;
    const result = existingReviewId
      ? await supabase.from('listing_reviews').update(payload).eq('id', existingReviewId).select().single()
      : await supabase.from('listing_reviews').insert(payload).select().single();
    const { data: savedReview, error } = result;
    if (error) {
      notify(error, 'error');
      return false;
    }
    const mergeReview = (currentListing) => {
      if (!currentListing || currentListing.id !== listing.id) return currentListing;
      const currentReviews = getReviews(currentListing).filter((review) => review.id !== existingReviewId);
      return { ...currentListing, reviews: currentReviews, reviews_count: currentReviews.length, userReview: savedReview };
    };
    setListings((current) => current.map(mergeReview));
    setSelectedListing((current) => mergeReview(current));
    notify('Reseña en revisión.', 'success');
    return true;
  }

  function joinAsSeller() {
    if (!user) {
      navigate('profile');
      return;
    }
    if (isSeller) {
      notify('Ya formas parte de los vendedores.', 'success');
      navigate('mine');
      return;
    }
    navigate('join');
  }

  const visibleListings = useMemo(() => {
    const term = filters.q.trim().toLowerCase();
    const selectedFacultyIds = getSelectedFacultyIds(filters);
    return listings.filter((listing) => {
      const matchesSold = isAdmin || listing.status !== 'deleted';
      const listingFacultyIds = getListingFacultyIds(listing);
      const matchesFaculty = selectedFacultyIds.length === 0 || selectedFacultyIds.some((id) => listingFacultyIds.includes(id));
      const matchesCategory = filters.categories.length === 0 || filters.categories.includes(listing.category_id);
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
    setNotifications([]);
    setView('explore');
  }

  async function deleteListing(id) {
    const { error } = await supabase.rpc('delete_listing', { p_listing_id: id });
    if (error) return notify(error, 'error');
    setListings((current) => current.filter((listing) => listing.id !== id));
    setSelectedListing((current) => current?.id === id ? null : current);
    notify('Publicación eliminada.', 'success');
  }

  async function markSold(id) {
    const { error } = await supabase.from('listings').update({ status: 'sold' }).eq('id', id);
    if (error) return notify(error, 'error');
    notify('Marcada como vendida.', 'success');
    await loadListings();
  }

  return (
    <div className="min-h-screen pb-32 text-ink md:pb-10">
      <PromoTicker />
      <Header
        user={user}
        profile={profile}
        view={view}
        onNavigate={navigate}
        isAdmin={isAdmin}
        isSeller={isSeller}
        unreadCount={notifications.filter((item) => !item.read_at).length}
      />

      {notice && (
        <button
          className={cx(
            'app-notice fixed left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-[28px] border px-5 py-4 text-center text-sm font-black text-white shadow-ios backdrop-blur-2xl',
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
              listings={listings.filter((listing) => listing.status !== 'deleted')}
              filters={filters}
              setFilters={setFilters}
              faculties={faculties}
              categories={categories}
              onOpenFaculty={openFaculty}
              onOpenCampus={openCampus}
              setView={setView}
              user={user}
              onJoin={joinAsSeller}
            />
          )}

          {view === 'catalog' && (
            <CatalogView
              user={user}
              loading={loading}
              listings={visibleListings}
              filters={filters}
              setFilters={setFilters}
              faculties={faculties}
              categories={categories}
              onOpen={setSelectedListing}
              onBack={() => setView('explore')}
              onLogin={() => setView('profile')}
            />
          )}

          {view === 'market' && marketSelection && (
            <SelectionMarket
              selection={marketSelection}
              faculties={faculties}
              listings={listings.filter((listing) => listing.status !== 'deleted')}
              onBack={() => setView('explore')}
              onOpen={setSelectedListing}
              onLogin={() => setView('profile')}
              user={user}
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
              onAuthenticated={loadProfile}
              onSignOut={signOut}
              setNotice={notify}
            />
          )}

          {view === 'join' && (
            <RequireAuth user={user} setView={setView}>
              <SellerApplication
                profile={profile}
                onSubmitted={async () => {
                  await loadProfile(user.id);
                  notify('Espera a que se valide tu negocio.', 'success');
                }}
                setNotice={notify}
                onOpenListings={() => navigate('mine')}
              />
            </RequireAuth>
          )}

          {view === 'notifications' && (
            <RequireAuth user={user} setView={setView}>
              <NotificationsView notifications={notifications} onRead={markNotificationsRead} />
            </RequireAuth>
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
                setNotice={notify}
                currentUserId={user?.id}
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

      <MobileNav view={view} setView={navigate} isAdmin={isAdmin} isSeller={isSeller} />

      {user && selectedListing && (
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
    <div className="promo-safe-top bg-orange-600">
      <div className="overflow-hidden border-b border-orange-300/20 py-2 text-xs font-black uppercase tracking-[0.16em] text-white">
        <div className="ticker-track whitespace-nowrap">
          <span className="mx-8">{text}</span>
          <span className="mx-8">{text}</span>
        </div>
      </div>
    </div>
  );
}

function Header({ user, profile, view, onNavigate, isAdmin, isSeller, unreadCount }) {
  const items = getNavigationItems(isSeller, isAdmin);
  const displayName = user ? profile?.full_name?.split(' ')[0] ?? user.email?.split('@')[0] ?? 'Perfil' : 'Invitado';
  const avatar = profile?.avatar_url;

  return (
    <header className="app-header relative z-20 px-3 py-3 md:sticky md:px-6">
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

        <div className="hidden items-center justify-self-end gap-2 md:flex">
          {user && (
            <button
              className={cx('relative grid h-11 w-11 place-items-center rounded-full border shadow-soft transition', view === 'notifications' ? 'border-campus bg-campus text-white' : 'border-orange-100 bg-white text-campus')}
              type="button"
              onClick={() => onNavigate('notifications')}
              aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
            >
              <span className="h-5 w-5"><NavIcon name="bell" /></span>
              {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{Math.min(unreadCount, 99)}</span>}
            </button>
          )}
          <button className="rounded-3xl border border-white/20 bg-white px-4 py-3 text-sm font-black text-ink shadow-soft transition active:scale-[0.98]" onClick={() => onNavigate(!user ? 'profile' : 'catalog')}>
            {!user ? 'Iniciar sesion' : 'Ver publicaciones'}
          </button>
        </div>

        {user ? (
          <button
            className={cx('absolute right-5 top-4 grid h-10 w-10 place-items-center rounded-full shadow-soft md:hidden', view === 'notifications' ? 'bg-campus text-white' : 'bg-orange-100 text-campus')}
            type="button"
            onClick={() => onNavigate('notifications')}
            aria-label={`Notificaciones${unreadCount ? `, ${unreadCount} sin leer` : ''}`}
          >
            <span className="h-5 w-5"><NavIcon name="bell" /></span>
            {unreadCount > 0 && <span className="absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-black text-white">{Math.min(unreadCount, 99)}</span>}
          </button>
        ) : (
          <button className="absolute right-5 top-5 rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-campus md:hidden" onClick={() => onNavigate('profile')}>
            Entrar
          </button>
        )}
      </div>
    </header>
  );
}

function Sidebar({ view, setView, isAdmin }) {
  const items = isAdmin ? [...navItems, { id: 'admin', label: 'Admin', icon: 'shield' }] : navItems;
  return (
    <nav className="panel sticky top-24 space-y-2 p-3">
      {items.map((item) => (
        <button
          key={item.id}
          className={cx('flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold', view === item.id ? 'bg-ink text-white' : 'text-slate-600 hover:bg-slate-50')}
          onClick={() => setView(item.id)}
        >
          <span className="grid h-7 w-7 place-items-center rounded-full bg-white/20"><NavIcon name={item.icon} /></span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}

function MobileNav({ view, setView, isAdmin, isSeller }) {
  const items = getNavigationItems(isSeller, isAdmin);
  return (
    <nav className="mobile-nav-shell fixed bottom-0 left-0 right-0 z-40 md:hidden">
      <div className={cx('mobile-nav-panel liquid mx-auto grid max-w-md gap-1 rounded-[24px] p-1.5', items.length === 6 ? 'grid-cols-6' : items.length === 5 ? 'grid-cols-5' : items.length === 4 ? 'grid-cols-4' : 'grid-cols-3')}>
        {items.map((item) => (
          <button
            key={item.id}
            className={cx('mobile-nav-button min-w-0 rounded-2xl px-1 py-2 text-[10px] font-black transition', view === item.id ? 'bg-campus text-white shadow-soft' : 'text-slate-500')}
            onClick={() => setView(item.id)}
          >
            <span className="mx-auto mb-1 block h-5 w-5"><NavIcon name={item.icon} /></span>
            <span className="block truncate">{item.label}</span>
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

function Explore({ listings, filters, setFilters, faculties, categories, onOpenFaculty, onOpenCampus, setView, user, onJoin }) {
  const activeListings = listings.filter((listing) => listing.status === 'active').length;
  const sellerCount = new Set(listings.map((listing) => listing.seller_id).filter(Boolean)).size;
  const openCatalog = () => {
    if (!user) {
      setView('profile');
      return;
    }
    setView('catalog');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-10 md:space-y-14">
      <IOSInstallPrompt />
      <HeroCarousel onVisit={() => {
        setFilters(createEmptyFilters());
        openCatalog();
      }} />

      <section className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-3">
        <button className="panel p-5 text-left transition hover:-translate-y-1 hover:shadow-ios" type="button" onClick={openCatalog}>
          <span className="text-3xl font-black text-campus">{activeListings}</span>
          <span className="mt-1 block text-sm font-black text-slate-900">Productos activos</span>
          <span className="mt-1 block text-xs font-semibold text-slate-500">Explora todo el marketplace</span>
        </button>
        <div className="panel p-5">
          <span className="text-3xl font-black text-violet-600">{sellerCount}</span>
          <span className="mt-1 block text-sm font-black text-slate-900">Vendedores</span>
          <span className="mt-1 block text-xs font-semibold text-slate-500">Negocios aprobados y activos</span>
        </div>
        <div className="panel p-5">
          <span className="text-3xl font-black text-emerald-600">{faculties.length}</span>
          <span className="mt-1 block text-sm font-black text-slate-900">Facultades</span>
          <span className="mt-1 block text-xs font-semibold text-slate-500">Encuentra entregas cerca de ti</span>
        </div>
      </section>

      <section className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="label">Encuentra más rápido</p>
            <h2 className="mt-1 text-3xl font-black">Explora por categoría</h2>
          </div>
          <button className="hidden text-sm font-black text-campus underline sm:block" type="button" onClick={openCatalog}>Ver todo</button>
        </div>
        <FeaturedCategories categories={categories} setFilters={setFilters} onSelect={openCatalog} />
      </section>

      <CampusTags onSelect={onOpenCampus} />
      <FacultyTags faculties={faculties} selectedFaculties={filters.faculties} onOpenFaculty={onOpenFaculty} />
      <SellerJoin setView={setView} setFilters={setFilters} onJoin={onJoin} />
    </div>
  );
}

function CatalogView({ user, loading, listings, filters, setFilters, faculties, categories, onOpen, onBack, onLogin }) {
  if (!user) return <LoginGate onLogin={onLogin} />;
  const topListings = [...listings]
    .filter((listing) => getReviews(listing).length > 0)
    .sort((a, b) => {
      const ratingDifference = getListingRating(b) - getListingRating(a);
      if (ratingDifference) return ratingDifference;
      return getReviews(b).length - getReviews(a).length;
    })
    .slice(0, 3);

  return (
    <div className="space-y-5">
      <section className="panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-7">
        <div>
          <p className="label">Marketplace UANL</p>
          <h1 className="mt-2 text-3xl font-black md:text-4xl">Todas las publicaciones</h1>
          <p className="mt-2 text-sm text-slate-500">Busca y filtra productos por categoría y facultad.</p>
        </div>
        <button className="secondary-btn" type="button" onClick={onBack}>Volver</button>
      </section>

      <Filters filters={filters} setFilters={setFilters} faculties={faculties} categories={categories} />

      {!loading && topListings.length > 0 && (
        <section className="overflow-hidden rounded-[30px] bg-gradient-to-br from-amber-300 via-orange-400 to-red-500 p-[2px] shadow-[0_22px_70px_rgba(249,115,22,0.28)]">
          <div className="rounded-[28px] bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 md:p-7">
            <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-orange-600">Favoritos de la comunidad</p>
                <h2 className="mt-1 text-3xl font-black text-slate-950">Top publicaciones</h2>
              </div>
              <p className="text-sm font-bold text-orange-800/70">Las mejor valoradas por clientes</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {topListings.map((listing, index) => (
                <ListingCard key={`top-${listing.id}`} listing={listing} onOpen={() => onOpen(listing)} featured rank={index + 1} />
              ))}
            </div>
          </div>
        </section>
      )}

      {loading ? (
        <div className="panel p-8 text-center font-semibold text-slate-500">Cargando publicaciones...</div>
      ) : listings.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-black">No hay publicaciones con esos filtros.</p>
          <p className="mt-1 text-sm text-slate-500">Prueba con otra facultad, categoría o rango de precio.</p>
        </div>
      ) : (
        <>
          <p className="px-1 text-sm font-bold text-slate-500">{listings.length} publicaciones encontradas</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} onOpen={() => onOpen(listing)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function IOSInstallPrompt() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
    setVisible(isIos && !isStandalone && sessionStorage.getItem('phasvy-ios-install-dismissed') !== '1');
  }, []);

  if (!visible) return null;

  return (
    <aside className="panel mx-auto flex max-w-6xl items-start gap-4 p-5">
      <img src="/icons/apple-touch-icon.png" alt="" className="h-14 w-14 rounded-2xl shadow-soft" />
      <div className="min-w-0 flex-1">
        <p className="font-black">Instala Phasvy como app</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">En Safari toca Compartir y después “Agregar a pantalla de inicio”.</p>
      </div>
      <button
        className="rounded-full px-2 text-xl font-black text-slate-400"
        type="button"
        aria-label="Cerrar instrucciones"
        onClick={() => {
          sessionStorage.setItem('phasvy-ios-install-dismissed', '1');
          setVisible(false);
        }}
      >
        ×
      </button>
    </aside>
  );
}

function CampusTags({ onSelect }) {
  return (
    <section className="mx-auto max-w-6xl">
      <p className="mb-4 text-center text-xs font-black uppercase tracking-[0.18em] text-slate-500">Explora por campus</p>
      <div className="grid gap-4 md:grid-cols-3">
        {FEATURED_CAMPUSES.map((campus) => (
          <button
            key={campus.id}
            className="group relative min-h-52 overflow-hidden rounded-[24px] bg-slate-900 text-left shadow-ios"
            type="button"
            onClick={() => onSelect(campus)}
          >
            <img src={campus.image} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75 transition duration-500 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5 text-white">
              <div>
                <span className="text-xs font-black uppercase tracking-[0.14em] text-orange-200">Campus UANL</span>
                <h2 className="mt-1 text-2xl font-black">{campus.label}</h2>
              </div>
              <img src={campus.logo} alt="" className="h-12 w-12 rounded-full bg-white p-1 object-contain shadow-soft" />
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function LoginGate({ onLogin }) {
  return (
    <section className="dark-panel mx-auto max-w-3xl p-7 text-center md:p-10">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">Contenido para la comunidad</p>
      <h2 className="mt-3 text-3xl font-black text-white">Inicia sesion para ver las publicaciones</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/60">Los productos, datos de vendedores y botones de contacto solo aparecen para usuarios con una cuenta activa.</p>
      <button className="primary-btn mt-6" type="button" onClick={onLogin}>Iniciar sesion</button>
    </section>
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
        Fotos del hero en <span className="font-black text-campus">public/campus/</span>. Reemplaza los JPG manteniendo los nombres.
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ title, text, category, image }) => (
        <button
          key={title}
          className="group overflow-hidden rounded-[24px] border border-orange-100 bg-gradient-to-br from-white to-orange-50 p-4 text-left shadow-soft transition hover:-translate-y-1 hover:shadow-ios"
          type="button"
          onClick={() => {
            if (!category) return;
            setFilters((current) => ({ ...current, categories: [category.id] }));
            onSelect();
          }}
        >
          <div className="flex h-52 items-center justify-center overflow-hidden rounded-[18px] bg-white sm:h-60">
            <img src={image} alt="" className="max-h-full w-full object-contain transition group-hover:scale-105" />
          </div>
          <div className="px-2 pb-2 pt-4">
            <h3 className="text-2xl font-black text-slate-950">{title}</h3>
            <p className="mt-3 text-sm leading-6 text-slate-600">{text}</p>
            <span className="mt-4 inline-block text-sm font-black text-campus underline">Ver categoría</span>
          </div>
        </button>
      ))}
    </div>
  );
}

function FacultyTags({ faculties, selectedFaculties, onOpenFaculty }) {
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
          const brand = FACULTY_BRANDS[name] ?? { color: '#f97316', logo: '/faculties/uanl.jpg' };
          return (
            <button
              key={name}
              className={cx(
                'flex items-center gap-2 rounded-full border bg-white px-3 py-2 text-sm font-black shadow-sm transition hover:-translate-y-0.5',
                selectedFaculties.includes(faculty.id) ? 'ring-4 ring-orange-200' : '',
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
  const selectedCampusIds = filters.campuses ?? [];
  const selectedCategoryIds = filters.categories ?? [];
  const setSelectedFaculties = (ids, campuses = []) => setFilters((current) => ({
    ...current,
    faculties: [...new Set(ids)],
    campuses,
  }));
  const toggleFaculty = (facultyId) => {
    const nextIds = selectedFacultyIds.includes(facultyId)
      ? selectedFacultyIds.filter((id) => id !== facultyId)
      : [...selectedFacultyIds, facultyId];
    setSelectedFaculties(nextIds, []);
  };
  const applyCampus = (campus) => {
    const ids = getFacultyIdsByNames(faculties, campus.names);
    const isActive = selectedCampusIds.includes(campus.id);
    const nextIds = isActive
      ? selectedFacultyIds.filter((id) => !ids.includes(id))
      : [...selectedFacultyIds, ...ids];
    const nextCampuses = isActive
      ? selectedCampusIds.filter((id) => id !== campus.id)
      : [...selectedCampusIds, campus.id];
    setSelectedFaculties(nextIds, nextCampuses);
  };
  const toggleCategory = (categoryId) => update(
    'categories',
    selectedCategoryIds.includes(categoryId)
      ? selectedCategoryIds.filter((id) => id !== categoryId)
      : [...selectedCategoryIds, categoryId],
  );
  const activeCount = selectedFacultyIds.length + selectedCategoryIds.length
    + (filters.q ? 1 : 0) + (filters.min ? 1 : 0) + (filters.max ? 1 : 0);

  return (
    <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-soft">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-slate-950 to-slate-800 p-5 text-white md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-300">Encuentra exactamente lo que buscas</p>
          <h2 className="mt-1 text-2xl font-black">Filtros</h2>
        </div>
        <div className="flex items-center gap-3">
          {activeCount > 0 && <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-black">{activeCount} activos</span>}
          <button className="text-sm font-black text-white underline decoration-orange-400 underline-offset-4" type="button" onClick={() => setFilters(createEmptyFilters())}>
            Limpiar
          </button>
        </div>
      </div>

      <div className="space-y-6 p-4 md:p-6">
        <input className="field !border-orange-200 !bg-orange-50/40 !py-4" placeholder="Buscar productos, comida, libros o servicios..." value={filters.q} onChange={(event) => update('q', event.target.value)} />

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Campus <span className="normal-case tracking-normal text-slate-400">— selecciona todas sus facultades</span></p>
          <div className="flex flex-wrap gap-2">
            {CAMPUS_GROUPS.map((campus) => (
              <button key={campus.id} className={cx('chip', selectedCampusIds.includes(campus.id) && 'chip-active')} type="button" onClick={() => applyCampus(campus)}>
                {campus.shortLabel ?? campus.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">Facultades <span className="normal-case tracking-normal text-slate-400">— selección múltiple e individual</span></p>
            <button className="text-xs font-black text-campus" type="button" onClick={() => setSelectedFaculties([], [])}>Quitar todas</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {faculties.map((faculty) => (
              <button key={faculty.id} className={cx('chip', selectedFacultyIds.includes(faculty.id) && 'chip-active')} type="button" onClick={() => toggleFaculty(faculty.id)}>
                {faculty.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-3 text-xs font-black uppercase tracking-[0.12em] text-slate-500">Categorías <span className="normal-case tracking-normal text-slate-400">— puedes elegir varias</span></p>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button key={category.id} className={cx('chip', selectedCategoryIds.includes(category.id) && 'chip-active')} type="button" onClick={() => toggleCategory(category.id)}>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-t border-slate-100 pt-5 sm:grid-cols-2">
          <input className="field" type="number" min="0" placeholder="Precio mínimo" value={filters.min} onChange={(event) => update('min', event.target.value)} />
          <input className="field" type="number" min="0" placeholder="Precio máximo" value={filters.max} onChange={(event) => update('max', event.target.value)} />
        </div>
      </div>
    </div>
  );
}

function SelectionMarket({ selection, faculties, listings, onBack, onOpen, onLogin, user }) {
  const isCampus = selection.type === 'campus';
  const campus = isCampus ? CAMPUS_GROUPS.find((item) => item.id === selection.id) : null;
  const faculty = !isCampus ? faculties.find((item) => item.id === selection.id) : null;
  const selectedFacultyIds = isCampus ? getFacultyIdsByNames(faculties, campus?.names ?? []) : [selection.id];
  const selectedListings = listings.filter((listing) => getListingFacultyIds(listing).some((id) => selectedFacultyIds.includes(id)));
  const topSellers = getTopSellers(selectedListings);
  const parentCampus = !isCampus
    ? FEATURED_CAMPUSES.find((item) => item.names.some((name) => name.toLowerCase() === faculty?.name?.toLowerCase()))
    : campus;
  const brand = FACULTY_BRANDS[faculty?.name] ?? { color: '#f97316', logo: campus?.logo ?? '/faculties/uanl.jpg' };
  const title = isCampus ? campus?.label : faculty?.name;
  const bannerImage = parentCampus?.image ?? '/campus/hero-campus.jpg';

  return (
    <div className="space-y-5">
      <section className="dark-panel relative min-h-[22rem] overflow-hidden p-5 md:min-h-[28rem] md:p-7">
        <img src={bannerImage} alt="" className="absolute inset-0 h-full w-full object-cover opacity-65" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/35 to-black/20" />
        <button className="secondary-btn relative z-10 !border-white/20 !bg-black/25 !text-white backdrop-blur-xl" onClick={onBack}>
          Volver
        </button>
        <div className="absolute inset-x-5 bottom-5 z-10 grid gap-5 md:inset-x-7 md:bottom-7 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">{isCampus ? 'Campus UANL' : 'Facultad UANL'}</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-white md:text-6xl">{title ?? 'UANL'}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75">
              Todos los productos publicados para {title ?? 'esta selección'}, reunidos en un solo lugar.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-[22px] border border-white/15 bg-black/25 p-3 backdrop-blur-xl">
            <img src={brand.logo} alt="" className="h-14 w-14 rounded-full bg-white object-contain p-1" />
            <div>
              <p className="text-3xl font-black text-white">{selectedListings.length}</p>
              <p className="text-xs font-bold text-white/60">publicaciones</p>
            </div>
          </div>
        </div>
      </section>

      {!user ? (
        <LoginGate onLogin={onLogin} />
      ) : (
        <>
      <section className="panel p-4 md:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <p className="label">Top vendedores</p>
            <h2 className="text-2xl font-black">Mejor calificados</h2>
          </div>
          <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-campus">Top 5</span>
        </div>
        {topSellers.length === 0 ? (
          <p className="rounded-3xl bg-orange-50 p-4 text-sm font-bold text-orange-900">Todavía no hay vendedores con publicaciones en esta selección.</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-5">
            {topSellers.map((item, index) => (
              <div key={item.id} className="rounded-[22px] border border-orange-100 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-campus text-sm font-black text-white">#{index + 1}</span>
                  <RatingBadge rating={item.rating} count={item.reviewCount} compact />
                </div>
                <p className="mt-4 line-clamp-2 text-sm font-black">{item.seller?.business_name || item.seller?.full_name || 'Vendedor UANL'}</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">{item.listingCount} publicaciones activas</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedListings.length === 0 ? (
        <div className="panel p-8 text-center">
          <p className="font-black">No hay publicaciones en esta selección.</p>
          <p className="mt-1 text-sm text-slate-500">Cuando alguien publique aquí aparecerá en esta página.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {selectedListings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} onOpen={() => onOpen(listing)} />
          ))}
        </div>
      )}
        </>
      )}
    </div>
  );
}

function SellerJoin({ setView, setFilters, onJoin }) {
  const go = (nextView) => {
    setView(nextView);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const visitStores = () => {
    setFilters(createEmptyFilters());
    go('explore');
  };

  return (
    <section
      className="mx-auto mt-16 max-w-6xl overflow-hidden rounded-[18px] bg-[#f3f3f3] text-center shadow-soft"
      onClick={(event) => {
        if (event.target.tagName !== 'BUTTON') return;
        const text = event.target.textContent.toLowerCase();
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
          <button type="button" className="rounded-md bg-slate-500 px-8 py-3 text-sm font-black text-white transition hover:bg-slate-700" onClick={onJoin}>
            Quiero ser parte
          </button>
        </div>
      </div>
      <img src="/campus/footer-campus.jpg" alt="" className="h-80 w-full object-cover object-bottom" />
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
        className="group fixed bottom-8 right-8 z-30 hidden h-14 w-14 place-items-center rounded-full border border-white/70 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-600 text-white shadow-[0_16px_35px_rgba(234,88,12,0.35)] ring-4 ring-orange-100/70 transition duration-300 hover:-translate-y-1 hover:scale-105 hover:shadow-[0_20px_45px_rgba(234,88,12,0.45)] md:grid"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Volver arriba"
      >
        <svg aria-hidden="true" className="h-6 w-6 transition-transform group-hover:-translate-y-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 14 6-6 6 6" />
        </svg>
      </button>
    </section>
  );
}

function ListingCard({ listing, onOpen, featured = false, rank = null }) {
  const cover = listing.images?.[0]?.url;
  const facultyNames = (listing.faculties?.length ? listing.faculties : [listing.faculty]).filter(Boolean).map((faculty) => faculty.name);
  const facultyLabel = facultyNames.length > 1 ? `${facultyNames[0]} +${facultyNames.length - 1}` : facultyNames[0] ?? 'Campus';
  const rating = getListingRating(listing);
  const reviewCount = getReviews(listing).length || listing.reviews_count || 0;
  const sellerStats = getSellerStats([listing], listing.seller_id);
  return (
    <button className={cx('panel relative overflow-hidden text-left transition hover:-translate-y-1 hover:shadow-ios', featured && 'border border-orange-200 bg-white shadow-soft')} onClick={onOpen}>
      {featured && <span className="absolute left-4 top-4 z-10 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-3 py-1.5 text-xs font-black text-white shadow-lg">TOP #{rank}</span>}
      <div className="aspect-[4/3] bg-slate-100 p-2">
        <div className="h-full overflow-hidden rounded-[22px] bg-slate-200">
          {cover ? <img src={cover} alt={listing.title} className="h-full w-full bg-white object-contain" /> : <div className="grid h-full place-items-center text-4xl text-slate-300">+</div>}
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
            <p className="truncate text-xs font-black text-slate-500">{facultyLabel}</p>
            <p className="truncate text-xs font-bold text-slate-400">{listing.category?.name ?? 'General'}</p>
          </div>
          <p className={cx('shrink-0 rounded-full px-3 py-1.5 font-black text-white shadow-soft', featured ? 'bg-gradient-to-r from-orange-500 to-red-500 text-base' : 'bg-gradient-to-r from-slate-900 to-slate-700 text-sm')}>{currency.format(listing.price ?? 0)}</p>
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
  const facultyLabel = (listing.faculties?.length ? listing.faculties : [listing.faculty]).filter(Boolean).map((faculty) => faculty.name).join(', ');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/30 p-3 backdrop-blur-sm md:p-8">
      <div className="mx-auto max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-ios">
        <div className="grid md:grid-cols-2">
          <div className="bg-slate-100">
            <div className="flex snap-x gap-2 overflow-x-auto no-scrollbar">
              {coverImages.map((image, index) => (
                <div key={image.id ?? index} className="aspect-square min-w-full">
                  {image.url ? <img src={image.url} alt="" className="h-full w-full bg-white object-contain" /> : <div className="grid h-full place-items-center text-slate-300">Sin imagen</div>}
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-5 p-5 md:p-7">
            <div className="flex justify-between gap-4">
              <div>
                <p className="label">{facultyLabel || 'Campus'} - {listing.category?.name}</p>
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
              <p className="font-black">{listing.seller?.business_name || listing.seller?.full_name || 'Vendedor UANL'}</p>
              {listing.seller?.business_description && <p className="mt-1 text-slate-500">{listing.seller.business_description}</p>}
              <p className="mt-1 text-slate-500">{listing.contact_note || 'Acuerda entrega dentro del campus. No hay pagos en linea ni envios en esta version.'}</p>
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
  const userReview = listing.userReview ?? reviews.find((review) => review.reviewer_id === user?.id);

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

      {userReview?.status === 'pending' && (
        <div className="rounded-2xl border border-amber-200 bg-amber-100 px-4 py-3 text-sm font-black text-amber-900">
          Reseña en revisión
          <span className="mt-1 block text-xs font-semibold text-amber-800/75">El administrador debe aprobarla antes de que sea visible.</span>
        </div>
      )}

      {userReview?.status === 'rejected' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-black text-red-700">
          Tu reseña anterior no fue aprobada. Puedes corregirla y enviarla de nuevo.
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
          <button className="secondary-btn w-full" disabled={saving}>{saving ? 'Enviando a revisión...' : userReview ? 'Actualizar y enviar a revisión' : 'Enviar reseña a revisión'}</button>
        </form>
      ) : (
        <p className="border-t border-orange-100 pt-3 text-xs font-bold text-slate-500">Inicia sesion para dejar una resena. No se permiten enlaces, spam ni resenas falsas.</p>
      )}
    </div>
  );
}

function NotificationsView({ notifications, onRead }) {
  const unreadCount = notifications.filter((item) => !item.read_at).length;
  const styles = {
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
    business: 'bg-violet-100 text-violet-700',
    info: 'bg-sky-100 text-sky-700',
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <section className="flex flex-col gap-4 rounded-[26px] border border-slate-200 bg-white p-5 text-slate-950 shadow-sm md:flex-row md:items-center md:justify-between md:p-6">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-campus">Centro de avisos</p>
          <h1 className="mt-1 text-3xl font-black">Notificaciones</h1>
          <p className="mt-1 text-sm text-slate-500">{unreadCount ? `${unreadCount} sin leer` : 'Todo al día'}</p>
        </div>
        {unreadCount > 0 && <button className="text-left text-sm font-black text-campus" type="button" onClick={() => onRead()}>Marcar todas como leídas</button>}
      </section>

      {notifications.length === 0 ? (
        <section className="rounded-[26px] border border-dashed border-slate-300 bg-white/70 p-10 text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-orange-100 text-campus"><span className="h-6 w-6"><NavIcon name="bell" /></span></div>
          <h2 className="mt-4 text-xl font-black">Todavía no tienes notificaciones</h2>
          <p className="mt-2 text-sm text-slate-500">Aquí recibirás aprobaciones, cambios de rol, avisos y novedades de Phasvy.</p>
        </section>
      ) : (
        <div className="overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-sm">
          {notifications.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(
                'grid w-full grid-cols-[auto_1fr] gap-3 border-b border-slate-100 p-4 text-left transition last:border-b-0 hover:bg-slate-50 sm:grid-cols-[auto_1fr_auto] sm:items-start',
                !item.read_at && 'bg-orange-50/45',
              )}
              onClick={() => !item.read_at && onRead(item.id)}
            >
              <span className={cx('mt-0.5 grid h-9 w-9 place-items-center rounded-xl', item.read_at ? 'bg-slate-100 text-slate-400' : styles[item.notification_type] ?? styles.info)}>
                <span className="h-4 w-4"><NavIcon name="bell" /></span>
              </span>
              <span>
                <span className="flex items-center gap-2 font-black text-slate-900">{item.title}{!item.read_at && <span className="h-2 w-2 rounded-full bg-orange-500" />}</span>
                <span className="mt-1 block text-sm leading-5 text-slate-500">{item.message}</span>
              </span>
              <span className="col-start-2 text-xs font-semibold text-slate-400 sm:col-start-auto">{new Date(item.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SellerApplication({ profile, onSubmitted, setNotice, onOpenListings }) {
  const [businessName, setBusinessName] = useState(profile?.business_name ?? '');
  const [description, setDescription] = useState(profile?.business_description ?? '');
  const [saving, setSaving] = useState(false);
  const status = profile?.business_status ?? 'not_requested';

  if (profile?.role === 'seller' || profile?.role === 'admin') {
    return (
      <section className="panel mx-auto max-w-2xl p-7 text-center">
        <p className="label">Vendedor aprobado</p>
        <h1 className="mt-2 text-3xl font-black">Ya formas parte de los vendedores</h1>
        <p className="mt-3 text-sm text-slate-500">Administra tus productos y crea nuevas publicaciones desde tu panel.</p>
        <button className="primary-btn mt-6" type="button" onClick={onOpenListings}>Ir a mis publicaciones</button>
      </section>
    );
  }

  if (status === 'pending') {
    return (
      <section className="panel mx-auto max-w-2xl p-7 text-center">
        <p className="label">Solicitud recibida</p>
        <h1 className="mt-2 text-3xl font-black">Tu negocio está en espera de validación</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">El administrador revisará la información de <strong>{profile?.business_name}</strong>. Te daremos acceso para publicar cuando sea aprobado.</p>
      </section>
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (businessName.trim().length < 3) {
      setNotice('El nombre del negocio debe tener al menos 3 caracteres.', 'error');
      return;
    }
    if (description.trim().length < 20) {
      setNotice('Describe tu negocio con al menos 20 caracteres.', 'error');
      return;
    }
    setSaving(true);
    const { error } = await supabase.rpc('submit_business_application', {
      p_business_name: sanitizeSingleLine(businessName, 100),
      p_business_description: sanitizeMultiline(description, 600),
    });
    setSaving(false);
    if (error) {
      setNotice(error, 'error');
      return;
    }
    await onSubmitted();
  }

  return (
    <div className="mx-auto grid max-w-4xl gap-4 md:grid-cols-[0.9fr_1.1fr]">
      <section className="dark-panel p-7">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">Únete a Phasvy</p>
        <h1 className="mt-3 text-4xl font-black">Cambia tu cuenta de Cliente a Vendedor</h1>
        <p className="mt-4 text-sm leading-6 text-white/65">Cuéntanos qué vendes. Tu cuenta conservará el acceso de cliente mientras revisamos el negocio.</p>
        {status === 'rejected' && (
          <p className="mt-5 rounded-2xl bg-red-500/15 p-4 text-sm font-bold text-red-100">
            La solicitud anterior no fue aprobada{profile?.business_review_note ? `: ${profile.business_review_note}` : '.'}
          </p>
        )}
      </section>
      <form className="panel space-y-4 p-6" onSubmit={submit}>
        <div>
          <label className="label" htmlFor="seller-business-name">Nombre del negocio</label>
          <input id="seller-business-name" className="field mt-2" minLength="3" maxLength="100" required value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
        </div>
        <div>
          <label className="label" htmlFor="seller-business-description">Descripción</label>
          <textarea id="seller-business-description" className="field mt-2 min-h-36" minLength="20" maxLength="600" required value={description} onChange={(event) => setDescription(event.target.value)} />
        </div>
        <button className="primary-btn w-full" disabled={saving}>{saving ? 'Enviando...' : status === 'rejected' ? 'Enviar nueva solicitud' : 'Solicitar validación'}</button>
      </form>
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
      <p className="mt-2 text-sm leading-6 text-slate-500">Solicita la validación de tu negocio para publicar y gestionar productos.</p>
      <button className="primary-btn mt-5" onClick={() => setView('join')}>Quiero ser vendedor</button>
    </div>
  );
}

function ListingForm({ user, faculties, categories, editing, onDone, setNotice }) {
  const [form, setForm] = useState(editing ?? EMPTY_LISTING);
  const [selectedFacultyIds, setSelectedFacultyIds] = useState(() => {
    const existingIds = (editing?.faculties ?? []).map((faculty) => faculty.id).filter(Boolean);
    return existingIds.length ? existingIds : editing?.faculty_id ? [editing.faculty_id] : [];
  });
  const initialPhone = splitPhoneNumber(editing?.whatsapp);
  const [phoneCode, setPhoneCode] = useState(initialPhone.code);
  const [phone, setPhone] = useState(initialPhone.number);
  const [imageItems, setImageItems] = useState(() => (
    [...(editing?.images ?? [])]
      .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
      .map((image) => ({ ...image, key: image.id, kind: 'existing', preview: image.url }))
  ));
  const [saving, setSaving] = useState(false);
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setForm(editing ?? EMPTY_LISTING);
    const existingIds = (editing?.faculties ?? []).map((faculty) => faculty.id).filter(Boolean);
    setSelectedFacultyIds(existingIds.length ? existingIds : editing?.faculty_id ? [editing.faculty_id] : []);
    const nextPhone = splitPhoneNumber(editing?.whatsapp);
    setPhoneCode(nextPhone.code);
    setPhone(nextPhone.number);
    setImageItems(
      [...(editing?.images ?? [])]
        .sort((a, b) => Number(a.sort_order ?? 0) - Number(b.sort_order ?? 0))
        .map((image) => ({ ...image, key: image.id, kind: 'existing', preview: image.url })),
    );
  }, [editing?.id]);

  function toggleListingFaculty(facultyId) {
    setSelectedFacultyIds((current) => (
      current.includes(facultyId)
        ? current.filter((id) => id !== facultyId)
        : [...current, facultyId]
    ));
  }

  function toggleListingCampus(campus) {
    const ids = getFacultyIdsByNames(faculties, campus.names);
    const allSelected = ids.length > 0 && ids.every((id) => selectedFacultyIds.includes(id));
    setSelectedFacultyIds((current) => (
      allSelected
        ? current.filter((id) => !ids.includes(id))
        : [...new Set([...current, ...ids])]
    ));
  }

  function addImages(fileList) {
    const files = Array.from(fileList ?? []);
    const validFiles = files.filter((file) => file.type.startsWith('image/') && file.size <= MAX_LISTING_IMAGE_SIZE);
    if (validFiles.length !== files.length) {
      setNotice('Solo se aceptan imagenes de hasta 5 MB.', 'error');
    }
    const available = Math.max(0, MAX_LISTING_IMAGES - imageItems.length);
    if (validFiles.length > available) {
      setNotice(`Puedes subir hasta ${MAX_LISTING_IMAGES} imagenes por publicacion.`, 'error');
    }
    const additions = validFiles.slice(0, available).map((file) => ({
      key: `${file.name}-${file.lastModified}-${crypto.randomUUID()}`,
      kind: 'new',
      file,
      preview: URL.createObjectURL(file),
    }));
    setImageItems((current) => [...current, ...additions]);
  }

  function removeImage(index) {
    setImageItems((current) => {
      const item = current[index];
      if (item?.kind === 'new') URL.revokeObjectURL(item.preview);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function moveImage(index, direction) {
    setImageItems((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function saveListing(event) {
    event.preventDefault();
    if (imageItems.length < 1) {
      setNotice('Agrega al menos una foto del producto.', 'error');
      return;
    }
    if (form.description.trim().length < 10) {
      setNotice('La descripcion debe tener al menos 10 caracteres.', 'error');
      return;
    }
    if (selectedFacultyIds.length < 1) {
      setNotice('Selecciona al menos una facultad o un campus.', 'error');
      return;
    }
    if (phone.length !== 10) {
      setNotice('El WhatsApp debe tener exactamente 10 digitos.', 'error');
      return;
    }
    setSaving(true);

    const payload = {
      title: sanitizeSingleLine(form.title, 120),
      description: sanitizeMultiline(form.description, 3000),
      price: Number(form.price),
      faculty_id: selectedFacultyIds[0],
      category_id: form.category_id,
      whatsapp: `${getDialCode(phoneCode)}${phone}`,
      contact_note: sanitizeSingleLine(form.contact_note, 300),
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

    const { error: clearFacultiesError } = await supabase
      .from('listing_faculties')
      .delete()
      .eq('listing_id', result.data.id);
    if (clearFacultiesError) {
      setSaving(false);
      return setNotice(clearFacultiesError, 'error');
    }
    const { error: facultiesError } = await supabase.from('listing_faculties').insert(
      selectedFacultyIds.map((facultyId) => ({ listing_id: result.data.id, faculty_id: facultyId })),
    );
    if (facultiesError) {
      setSaving(false);
      return setNotice(facultiesError, 'error');
    }

    const existingItems = imageItems.filter((item) => item.kind === 'existing');
    const removedItems = (editing?.images ?? []).filter((image) => !existingItems.some((item) => item.id === image.id));
    if (removedItems.length) {
      const storagePaths = removedItems.map((image) => image.storage_path).filter(Boolean);
      if (storagePaths.length) await supabase.storage.from('listing-images').remove(storagePaths);
      const { error: removeError } = await supabase.from('listing_images').delete().in('id', removedItems.map((image) => image.id));
      if (removeError) {
        setSaving(false);
        return setNotice(removeError, 'error');
      }
    }

    for (const [sortOrder, item] of imageItems.entries()) {
      if (item.kind === 'existing') {
        const { error: orderError } = await supabase.from('listing_images').update({ sort_order: sortOrder }).eq('id', item.id);
        if (orderError) {
          setSaving(false);
          return setNotice(orderError, 'error');
        }
        continue;
      }
      const safeName = item.file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      const path = `${user.id}/${result.data.id}/${Date.now()}-${sortOrder}-${safeName}`;
      const upload = await supabase.storage.from('listing-images').upload(path, item.file, { upsert: false });
      if (upload.error) {
        setSaving(false);
        return setNotice(upload.error, 'error');
      }
      const { data } = supabase.storage.from('listing-images').getPublicUrl(path);
      const { error: imageError } = await supabase.from('listing_images').insert({
        listing_id: result.data.id,
        url: data.publicUrl,
        storage_path: path,
        sort_order: sortOrder,
      });
      if (imageError) {
        setSaving(false);
        return setNotice(imageError, 'error');
      }
    }

    imageItems.filter((item) => item.kind === 'new').forEach((item) => URL.revokeObjectURL(item.preview));
    setSaving(false);
    setNotice(editing?.id ? 'Publicacion actualizada.' : 'Publicacion creada.', 'success');
    onDone();
  }

  return (
    <form className="panel mx-auto max-w-3xl space-y-4 p-4 md:p-6" onSubmit={saveListing}>
      <div>
        <p className="label">{editing ? 'Editar publicacion' : 'Nueva publicacion'}</p>
        <h1 className="mt-2 text-3xl font-black">Publica en una o varias facultades</h1>
      </div>
      <input className="field" required placeholder="Titulo" value={form.title} onChange={(event) => update('title', event.target.value)} />
      <textarea className="field min-h-32" required minLength="10" placeholder="Descripcion, estado, punto de entrega..." value={form.description} onChange={(event) => update('description', event.target.value)} />
      <div className="grid gap-3 md:grid-cols-2">
        <input className="field" required type="number" min="0" placeholder="Precio MXN" value={form.price} onChange={(event) => update('price', event.target.value)} />
        <select className="field" required value={form.category_id} onChange={(event) => update('category_id', event.target.value)}>
          <option value="">Categoria</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      <div className="space-y-4 rounded-3xl border border-orange-100 bg-orange-50/50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black">¿Dónde quieres publicar?</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">Elige facultades individualmente o selecciona un campus completo.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-campus">{selectedFacultyIds.length} seleccionadas</span>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Campus</p>
          <div className="flex flex-wrap gap-2">
            {CAMPUS_GROUPS.map((campus) => {
              const ids = getFacultyIdsByNames(faculties, campus.names);
              const active = ids.length > 0 && ids.every((id) => selectedFacultyIds.includes(id));
              return (
                <button key={campus.id} className={cx('chip', active && 'chip-active')} type="button" onClick={() => toggleListingCampus(campus)}>
                  {campus.shortLabel ?? campus.label}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.1em] text-slate-500">Facultades</p>
          <div className="flex flex-wrap gap-2">
            {faculties.map((faculty) => (
              <button key={faculty.id} className={cx('chip', selectedFacultyIds.includes(faculty.id) && 'chip-active')} type="button" onClick={() => toggleListingFaculty(faculty.id)}>
                {faculty.name}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <div className="grid grid-cols-[8.5rem_1fr] gap-2">
          <select className="field" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} aria-label="Lada de WhatsApp">
            {PHONE_CODES.map((code) => (
              <option key={code.id} value={code.id}>{code.label}</option>
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
        <input className="field" placeholder="Nota de contacto opcional" value={form.contact_note ?? ''} onChange={(event) => update('contact_note', event.target.value)} />
      </div>
      <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-black">Imagenes</p>
            <p className="text-xs font-semibold text-slate-500">Obligatorio: mínimo 1 y máximo {MAX_LISTING_IMAGES}. La primera será la portada.</p>
          </div>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-campus">{imageItems.length}/{MAX_LISTING_IMAGES}</span>
        </div>
        {imageItems.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {imageItems.map((item, index) => (
              <div key={item.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="relative aspect-square bg-slate-100">
                  <img src={item.preview} alt={`Imagen ${index + 1}`} className="h-full w-full bg-white object-contain" />
                  {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-campus px-2 py-1 text-[10px] font-black text-white">Portada</span>}
                </div>
                <div className="grid grid-cols-3 gap-1 p-1.5">
                  <button className="rounded-xl bg-slate-100 py-2 font-black disabled:opacity-30" type="button" title="Mover a la izquierda" aria-label="Mover a la izquierda" disabled={index === 0} onClick={() => moveImage(index, -1)}>‹</button>
                  <button className="rounded-xl bg-red-50 py-2 font-black text-red-600" type="button" title="Eliminar imagen" aria-label="Eliminar imagen" onClick={() => removeImage(index)}>×</button>
                  <button className="rounded-xl bg-slate-100 py-2 font-black disabled:opacity-30" type="button" title="Mover a la derecha" aria-label="Mover a la derecha" disabled={index === imageItems.length - 1} onClick={() => moveImage(index, 1)}>›</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {imageItems.length < MAX_LISTING_IMAGES && (
          <label className="block cursor-pointer rounded-2xl border border-dashed border-orange-300 bg-white p-4 text-center text-sm font-black text-campus transition hover:bg-orange-50">
            Agregar imagenes
            <input
              className="sr-only"
              type="file"
              multiple
              accept="image/png,image/jpeg,image/webp,image/gif"
              onChange={(event) => {
                addImages(event.target.files);
                event.target.value = '';
              }}
            />
          </label>
        )}
      </div>
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
                {listing.images?.[0]?.url && <img src={listing.images[0].url} alt="" className="h-full w-full bg-white object-contain" />}
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
          Volver
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

function Profile({ user, profile, onSaved, onAuthenticated, onSignOut, setNotice }) {
  if (!isSupabaseConfigured) return <SetupWarning />;
  if (!user) return <AuthForm setNotice={setNotice} onAuthenticated={onAuthenticated} />;
  return <ProfileForm user={user} profile={profile} onSaved={onSaved} onSignOut={onSignOut} setNotice={setNotice} />;
}

function AuthFieldError({ id, message }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
      {message}
    </p>
  );
}

function AuthForm({ setNotice, onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessDescription, setBusinessDescription] = useState('');
  const [phoneCode, setPhoneCode] = useState('MX');
  const [phone, setPhone] = useState('');
  const [accountRole, setAccountRole] = useState('user');
  const [saving, setSaving] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [showMailHelp, setShowMailHelp] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const clearFieldError = (field) => {
    setFieldErrors((current) => {
      if (!current[field] && !current.form) return current;
      const next = { ...current };
      delete next[field];
      delete next.form;
      return next;
    });
  };

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setFieldErrors({});
  };

  function validateAuthForm() {
    const errors = {};
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.replace(/\D/g, '');

    if (!normalizedEmail) errors.email = 'Escribe tu correo.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) errors.email = 'Escribe un correo válido.';

    if (!password) errors.password = 'Escribe tu contraseña.';
    else if (password.length < 6) errors.password = 'La contraseña debe tener al menos 6 caracteres.';

    if (mode === 'signup') {
      if (!ALLOWED_EMAIL_DOMAINS.has(getEmailDomain(normalizedEmail))) {
        errors.email = 'Usa un correo de Gmail, Hotmail, Outlook, UANL, Yahoo o iCloud.';
      }
      if (fullName.trim().length < 3) errors.fullName = 'Escribe tu nombre completo.';
      if (normalizedPhone.length !== 10) errors.phone = 'El WhatsApp debe tener exactamente 10 dígitos.';
      if (password !== confirmPassword) errors.confirmPassword = 'Las contraseñas no coinciden.';
      if (accountRole === 'seller' && businessName.trim().length < 3) errors.businessName = 'Escribe el nombre de tu negocio.';
      if (accountRole === 'seller' && businessDescription.trim().length < 20) errors.businessDescription = 'Describe tu negocio con al menos 20 caracteres.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function showAuthFailure(error, context) {
    const rawMessage = String(error?.message ?? error ?? '').toLowerCase();
    const message = getErrorMessage(error, context);
    let field = 'form';

    if (rawMessage.includes('invalid login credentials')) field = 'password';
    else if (rawMessage.includes('email') || rawMessage.includes('user already registered')) field = 'email';
    else if (rawMessage.includes('password')) field = 'password';
    else if (rawMessage.includes('phone') || rawMessage.includes('whatsapp')) field = 'phone';
    else if (rawMessage.includes('business')) field = 'businessName';

    setFieldErrors({ [field]: message });
  }

  async function submit(event) {
    event.preventDefault();
    if (!validateAuthForm()) return;
    const normalizedPhone = phone.replace(/\D/g, '');
    setFieldErrors({});
    setSaving(true);
    let result;
    try {
      result =
        mode === 'login'
          ? await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
          : await supabase.auth.signUp({
              email: email.trim().toLowerCase(),
              password,
              options: {
                data: {
                  full_name: sanitizeSingleLine(fullName, 120),
                  whatsapp: `${getDialCode(phoneCode)}${normalizedPhone}`,
                  role: accountRole,
                  business_name: accountRole === 'seller' ? sanitizeSingleLine(businessName, 100) : '',
                  business_description: accountRole === 'seller' ? sanitizeMultiline(businessDescription, 600) : '',
                },
              },
            });
    } catch (error) {
      setSaving(false);
      showAuthFailure(error, mode);
      return;
    }
    setSaving(false);
    if (result.error) return showAuthFailure(result.error, mode);
    if (result.data?.user && (mode === 'login' || result.data.session)) {
      if (mode === 'signup') {
        const { error: profileError } = await supabase.from('users').upsert({
          id: result.data.user.id,
          email: result.data.user.email ?? email,
          full_name: sanitizeSingleLine(fullName, 120),
          whatsapp: `${getDialCode(phoneCode)}${normalizedPhone}`,
          business_name: accountRole === 'seller' ? sanitizeSingleLine(businessName, 100) : null,
          business_description: accountRole === 'seller' ? sanitizeMultiline(businessDescription, 600) : null,
        });
        if (profileError) {
          setFieldErrors({ form: getErrorMessage(profileError) });
          return;
        }
      }
      await onAuthenticated(result.data.user.id);
    }
    if (mode === 'signup') {
      if (result.data?.session) {
        setNotice(accountRole === 'seller' ? 'Solicitud enviada. Espera a que se valide tu negocio.' : 'Cuenta de cliente creada.', 'success');
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
                setVerificationError(getErrorMessage(error, 'login'));
                return;
              }
              if (result.error) {
                setVerificationError(getErrorMessage(result.error, 'login'));
                return;
              }
              setVerificationError('');
              setVerificationSent(false);
              setMode('login');
            }}
          >
            Ya lo recibi
          </button>
          {verificationError && <AuthFieldError id="verification-error" message={verificationError} />}
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
      <form className="panel space-y-4 p-5 md:p-6" onSubmit={submit} noValidate>
        <AuthFieldError id="auth-form-error" message={fieldErrors.form} />
        <div className="grid grid-cols-2 border-b border-orange-100">
          <button
            type="button"
            className={cx('border-b-4 px-3 py-3 text-sm font-black transition', mode === 'login' ? 'border-campus text-campus' : 'border-transparent text-slate-400')}
            onClick={() => changeMode('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            className={cx('border-b-4 px-3 py-3 text-sm font-black transition', mode === 'signup' ? 'border-campus text-campus' : 'border-transparent text-slate-400')}
            onClick={() => changeMode('signup')}
          >
            Crear cuenta
          </button>
        </div>
        {mode === 'signup' && (
          <>
            <fieldset className="space-y-2">
              <legend className="label">¿Cómo usarás Phasvy?</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className={cx('rounded-3xl border p-4 text-left transition', accountRole === 'user' ? 'border-campus bg-orange-50 shadow-soft' : 'border-slate-200 bg-white')}
                  onClick={() => {
                    setAccountRole('user');
                    clearFieldError('businessName');
                  }}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-black">Cliente</span>
                    <span className={cx('h-4 w-4 rounded-full border-4', accountRole === 'user' ? 'border-campus bg-white' : 'border-slate-300')} />
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">Explora productos y contacta vendedores.</span>
                </button>
                <button
                  type="button"
                  className={cx('rounded-3xl border p-4 text-left transition', accountRole === 'seller' ? 'border-campus bg-orange-50 shadow-soft' : 'border-slate-200 bg-white')}
                  onClick={() => {
                    setAccountRole('seller');
                    clearFieldError('businessName');
                  }}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="font-black">Vendedor</span>
                    <span className={cx('h-4 w-4 rounded-full border-4', accountRole === 'seller' ? 'border-campus bg-white' : 'border-slate-300')} />
                  </span>
                  <span className="mt-2 block text-xs leading-5 text-slate-500">Publica y administra productos de tu negocio.</span>
                </button>
              </div>
            </fieldset>
            <AuthFieldError id="full-name-error" message={fieldErrors.fullName} />
            <input
              className="field"
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? 'full-name-error' : undefined}
              placeholder="Nombre completo"
              value={fullName}
              onChange={(event) => {
                setFullName(event.target.value);
                clearFieldError('fullName');
              }}
            />
            <AuthFieldError id="phone-error" message={fieldErrors.phone} />
            <div className="grid grid-cols-[8.5rem_1fr] gap-2">
              <select className="field" value={phoneCode} onChange={(event) => setPhoneCode(event.target.value)} aria-label="Lada">
                {PHONE_CODES.map((code) => (
                  <option key={code.id} value={code.id}>
                    {code.label}
                  </option>
                ))}
              </select>
              <input
                className="field"
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? 'phone-error' : undefined}
                inputMode="numeric"
                maxLength="10"
                placeholder="WhatsApp 10 digitos"
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value.replace(/\D/g, '').slice(0, 10));
                  clearFieldError('phone');
                }}
              />
            </div>
          </>
        )}
        {mode === 'signup' && accountRole === 'seller' && (
          <>
            <AuthFieldError id="business-name-error" message={fieldErrors.businessName} />
            <input
              className="field"
              aria-invalid={Boolean(fieldErrors.businessName)}
              aria-describedby={fieldErrors.businessName ? 'business-name-error' : undefined}
              minLength="3"
              maxLength="100"
              placeholder="Nombre de tu negocio"
              value={businessName}
              onChange={(event) => {
                setBusinessName(event.target.value);
                clearFieldError('businessName');
              }}
            />
            <AuthFieldError id="business-description-error" message={fieldErrors.businessDescription} />
            <textarea
              className="field min-h-28"
              aria-invalid={Boolean(fieldErrors.businessDescription)}
              aria-describedby={fieldErrors.businessDescription ? 'business-description-error' : undefined}
              minLength="20"
              maxLength="600"
              placeholder="Describe qué vende tu negocio"
              value={businessDescription}
              onChange={(event) => {
                setBusinessDescription(event.target.value);
                clearFieldError('businessDescription');
              }}
            />
          </>
        )}
        <AuthFieldError id="email-error" message={fieldErrors.email} />
        <input
          className="field"
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          type="email"
          placeholder="Correo UANL o personal"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            clearFieldError('email');
          }}
        />
        <AuthFieldError id="password-error" message={fieldErrors.password} />
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="field"
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? 'password-error' : undefined}
            type={showPassword ? 'text' : 'password'}
            minLength="6"
            placeholder="Contraseña"
            value={password}
            onChange={(event) => {
              setPassword(event.target.value);
              clearFieldError('password');
            }}
          />
          <button className="secondary-btn !px-4" type="button" onClick={() => setShowPassword((current) => !current)}>
            {showPassword ? 'Ocultar' : 'Ver'}
          </button>
        </div>
        {mode === 'signup' && (
          <>
            <AuthFieldError id="confirm-password-error" message={fieldErrors.confirmPassword} />
            <input
              className="field"
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={fieldErrors.confirmPassword ? 'confirm-password-error' : undefined}
              type={showPassword ? 'text' : 'password'}
              minLength="6"
              placeholder="Repetir contraseña"
              value={confirmPassword}
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                clearFieldError('confirmPassword');
              }}
            />
          </>
        )}
        <button className="primary-btn w-full" disabled={saving}>{saving ? 'Procesando...' : mode === 'login' ? 'Entrar' : 'Crear cuenta'}</button>
      </form>
    </div>
  );
}

function ProfileForm({ user, profile, onSaved, onSignOut, setNotice }) {
  const [form, setForm] = useState({ full_name: '', whatsapp: '', faculty_id: '', avatar_url: '', business_name: '', business_description: '' });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    setForm({
      full_name: profile?.full_name ?? user.user_metadata?.full_name ?? '',
      whatsapp: profile?.whatsapp ?? user.user_metadata?.whatsapp ?? '',
      faculty_id: profile?.faculty_id ?? '',
      avatar_url: profile?.avatar_url ?? '',
      business_name: profile?.business_name ?? user.user_metadata?.business_name ?? '',
      business_description: profile?.business_description ?? '',
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
      full_name: sanitizeSingleLine(form.full_name, 120),
      whatsapp: normalizePhone(form.whatsapp).slice(0, 15),
      faculty_id: form.faculty_id || null,
      avatar_url: form.avatar_url || null,
      business_name: profile?.role === 'seller' ? sanitizeSingleLine(form.business_name, 100) : null,
      business_description: profile?.role === 'seller' ? sanitizeMultiline(form.business_description, 600) : null,
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
      {profile?.role === 'seller' && (
        <>
          <input className="field" required minLength="3" maxLength="100" placeholder="Nombre de tu negocio" value={form.business_name} onChange={(event) => setForm({ ...form, business_name: event.target.value })} />
          <textarea className="field min-h-28" maxLength="500" placeholder="Descripcion de tu negocio" value={form.business_description} onChange={(event) => setForm({ ...form, business_description: event.target.value })} />
        </>
      )}
      <button className="primary-btn w-full">Guardar perfil</button>
      <button type="button" className="secondary-btn w-full" onClick={onSignOut}>Cerrar sesion</button>
    </form>
  );
}

function AdminPanel({ isAdmin, listings, faculties, categories, reload, onDelete, setNotice, currentUserId }) {
  const [users, setUsers] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [tab, setTab] = useState('businesses');
  const [loadingUsers, setLoadingUsers] = useState(false);

  async function loadUsers() {
    if (!isAdmin) return;
    setLoadingUsers(true);
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, business_name, business_description, business_status, business_submitted_at, business_review_note, role, is_blocked')
      .order('created_at', { ascending: false });
    setLoadingUsers(false);
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setUsers(data ?? []);
  }

  async function loadPendingReviews() {
    if (!isAdmin) return;
    const { data, error } = await supabase
      .from('listing_reviews')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true });
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setPendingReviews(data ?? []);
  }

  useEffect(() => {
    loadUsers();
    loadPendingReviews();
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return undefined;
    const channel = supabase
      .channel('admin-review-moderation')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'listing_reviews' }, loadPendingReviews)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  if (!isAdmin) {
    return <div className="panel p-8 text-center font-black">No tienes permisos de administrador.</div>;
  }

  const pendingBusinesses = users.filter((item) => item.business_status === 'pending');

  async function reviewBusiness(id, approve) {
    const note = approve ? null : window.prompt('Motivo del rechazo (opcional):') ?? null;
    const { error } = await supabase.rpc('review_business_application', {
      applicant_id: id,
      approve,
      review_note: note,
    });
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setNotice(approve ? 'Negocio aprobado. El usuario ya es vendedor.' : 'Solicitud rechazada.', 'success');
    await Promise.all([loadUsers(), reload()]);
  }

  async function changeRole(id, role) {
    const { error } = await supabase.rpc('admin_set_user_role', { target_id: id, new_role: role });
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setNotice('Rol actualizado.', 'success');
    await Promise.all([loadUsers(), reload()]);
  }

  async function moderateReview(id, approve) {
    const { error } = await supabase.rpc('admin_review_listing_review', {
      p_review_id: id,
      p_approve: approve,
    });
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setPendingReviews((current) => current.filter((review) => review.id !== id));
    setNotice(approve ? 'Reseña aprobada y publicada.' : 'Reseña rechazada.', 'success');
    await reload();
  }

  async function toggleBlocked(item) {
    const { error } = await supabase.from('users').update({ is_blocked: !item.is_blocked }).eq('id', item.id);
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setNotice(item.is_blocked ? 'Usuario desbloqueado.' : 'Usuario bloqueado.', 'success');
    await loadUsers();
  }

  async function changeListingStatus(id, status) {
    const { error } = await supabase.from('listings').update({ status }).eq('id', id);
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setNotice('Estado de publicación actualizado.', 'success');
    await reload();
  }

  return (
    <div className="space-y-5">
      <section className="dark-panel p-6 md:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-200">Control Phasvy</p>
        <h1 className="mt-2 text-4xl font-black">Panel administrador</h1>
        <div className="mt-6 flex flex-wrap gap-2">
          {[
            ['businesses', `Negocios (${pendingBusinesses.length})`],
            ['reviews', `Reseñas (${pendingReviews.length})`],
            ['users', `Usuarios (${users.length})`],
            ['listings', `Publicaciones (${listings.length})`],
            ['notices', 'Avisos'],
            ['catalogs', 'Catálogos'],
          ].map(([id, label]) => (
            <button key={id} type="button" className={cx('rounded-full px-4 py-2 text-xs font-black', tab === id ? 'bg-orange-500 text-white' : 'bg-white/10 text-white')} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {tab === 'businesses' && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black">Validación de negocios</h2>
            <p className="mt-1 text-sm text-slate-500">Las cuentas permanecen como clientes hasta que apruebes su negocio.</p>
          </div>
          {loadingUsers ? (
            <p className="p-6 text-sm font-bold text-slate-500">Cargando solicitudes...</p>
          ) : pendingBusinesses.length === 0 ? (
            <p className="p-6 text-sm font-bold text-slate-500">No hay negocios pendientes.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingBusinesses.map((item) => (
                <article key={item.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="text-lg font-black">{item.business_name}</p>
                    <p className="text-sm font-bold text-slate-500">{item.full_name || item.email}</p>
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{item.business_description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button className="primary-btn !py-2" type="button" onClick={() => reviewBusiness(item.id, true)}>Aprobar</button>
                    <button className="secondary-btn !border-red-200 !py-2 !text-red-600" type="button" onClick={() => reviewBusiness(item.id, false)}>Rechazar</button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black">Roles y permisos</h2></div>
          <div className="divide-y divide-slate-100">
            {users.map((item) => (
              <div key={item.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_13rem_auto] lg:items-center">
                <div className="min-w-0">
                  <p className="truncate font-black">{item.full_name || 'Sin nombre'} {item.id === currentUserId && '(tú)'}</p>
                  <p className="truncate text-xs font-semibold text-slate-500">{item.email}</p>
                </div>
                <select className="field" value={item.role} disabled={item.id === currentUserId} onChange={(event) => changeRole(item.id, event.target.value)}>
                  <option value="guest">Usuario sin registrar</option>
                  <option value="user">Cliente</option>
                  <option value="seller">Vendedor</option>
                  <option value="admin">Admin</option>
                </select>
                <button className={cx('secondary-btn !py-2', item.is_blocked && '!border-emerald-200 !text-emerald-700')} type="button" onClick={() => toggleBlocked(item)}>
                  {item.is_blocked ? 'Desbloquear' : 'Bloquear'}
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'reviews' && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="text-xl font-black">Reseñas por aprobar</h2>
            <p className="mt-1 text-sm text-slate-500">Solo las reseñas aprobadas afectan la calificación y aparecen públicamente.</p>
          </div>
          {pendingReviews.length === 0 ? (
            <p className="p-6 text-sm font-bold text-slate-500">No hay reseñas pendientes.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {pendingReviews.map((review) => {
                const listing = listings.find((item) => item.id === review.listing_id);
                const reviewer = users.find((item) => item.id === review.reviewer_id);
                return (
                  <article key={review.id} className="grid gap-4 p-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-campus">★ {Number(review.rating).toFixed(1)}</span>
                        <span className="text-xs font-bold text-slate-400">{new Date(review.created_at).toLocaleDateString('es-MX')}</span>
                      </div>
                      <p className="mt-3 font-black">{listing?.title ?? 'Publicación eliminada'}</p>
                      <p className="mt-1 text-sm leading-6 text-slate-600">{review.comment}</p>
                      <p className="mt-2 text-xs font-bold text-slate-400">Por {reviewer?.full_name || reviewer?.email || review.reviewer_id}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="primary-btn !py-2" type="button" onClick={() => moderateReview(review.id, true)}>Aprobar</button>
                      <button className="secondary-btn !border-red-200 !py-2 !text-red-600" type="button" onClick={() => moderateReview(review.id, false)}>Rechazar</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === 'listings' && (
        <section className="panel overflow-hidden">
          <div className="border-b border-slate-100 p-5"><h2 className="text-xl font-black">Control de publicaciones</h2></div>
          <div className="divide-y divide-slate-100">
            {listings.map((listing) => (
              <div key={listing.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                <div>
                  <p className="font-black">{listing.title}</p>
                  <p className="text-sm text-slate-500">{listing.seller?.business_name || listing.seller?.full_name || listing.seller_id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <select className="field !w-auto" value={listing.status} onChange={(event) => changeListingStatus(listing.id, event.target.value)}>
                    <option value="active">Activa</option>
                    <option value="sold">Vendida</option>
                    <option value="deleted">Eliminada</option>
                  </select>
                  <button className="secondary-btn !border-coral/30 !py-2 !text-coral" type="button" onClick={() => onDelete(listing.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === 'notices' && <AdminNoticeComposer setNotice={setNotice} />}

      {tab === 'catalogs' && (
        <>
          <CatalogManager title="Facultades" table="faculties" items={faculties} reload={reload} setNotice={setNotice} />
          <CatalogManager title="Categorias" table="categories" items={categories} reload={reload} setNotice={setNotice} />
        </>
      )}
    </div>
  );
}

function AdminNoticeComposer({ setNotice }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);

  async function send(event) {
    event.preventDefault();
    setSending(true);
    const { data, error } = await supabase.rpc('admin_send_notification', {
      p_title: sanitizeSingleLine(title, 100),
      p_message: sanitizeMultiline(message, 1000),
      p_audience: audience,
    });
    setSending(false);
    if (error) {
      setNotice(error, 'error');
      return;
    }
    setTitle('');
    setMessage('');
    setNotice(`Aviso enviado a ${Number(data ?? 0)} cuentas.`, 'success');
  }

  return (
    <section className="panel p-5 md:p-7">
      <p className="label">Comunicaciones</p>
      <h2 className="mt-2 text-2xl font-black">Enviar aviso o boletín</h2>
      <p className="mt-2 text-sm text-slate-500">La notificación aparecerá en tiempo real en el botón de campana de cada destinatario.</p>
      <form className="mt-6 space-y-4" onSubmit={send}>
        <div className="grid gap-4 md:grid-cols-[1fr_14rem]">
          <input className="field" minLength="3" maxLength="100" required placeholder="Título del aviso" value={title} onChange={(event) => setTitle(event.target.value)} />
          <select className="field" value={audience} onChange={(event) => setAudience(event.target.value)}>
            <option value="all">Clientes y vendedores</option>
            <option value="clients">Solo clientes</option>
            <option value="sellers">Solo vendedores</option>
          </select>
        </div>
        <textarea className="field min-h-36" minLength="3" maxLength="1000" required placeholder="Escribe el aviso, boletín o novedad" value={message} onChange={(event) => setMessage(event.target.value)} />
        <button className="primary-btn" disabled={sending}>{sending ? 'Enviando...' : 'Enviar notificación'}</button>
      </form>
    </section>
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
