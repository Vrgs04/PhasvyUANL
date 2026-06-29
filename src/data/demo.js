export const DEMO_FACULTIES = [
  { id: 'fac-fime', name: 'FIME', is_active: true },
  { id: 'fac-facpya', name: 'FACPyA', is_active: true },
  { id: 'fac-facdyc', name: 'FACDyC', is_active: true },
  { id: 'fac-medicina', name: 'Medicina', is_active: true },
  { id: 'fac-fapsi', name: 'FAPSI', is_active: true },
  { id: 'fac-farq', name: 'FARQ', is_active: true },
  { id: 'fac-odonto', name: 'Odontologia', is_active: true },
  { id: 'fac-fcq', name: 'FCQ', is_active: true },
];

export const DEMO_CATEGORIES = [
  { id: 'cat-bebidas', name: 'Bebidas', is_active: true },
  { id: 'cat-comidas', name: 'Comidas', is_active: true },
  { id: 'cat-postres', name: 'Postres', is_active: true },
  { id: 'cat-libros', name: 'Libros', is_active: true },
  { id: 'cat-tecnologia', name: 'Tecnologia', is_active: true },
  { id: 'cat-servicios', name: 'Servicios', is_active: true },
];

export const DEMO_SELLERS = [
  'Andrea Ruiz', 'Diego Santos', 'Mariana Garza', 'Luis Trevino', 'Camila Rios',
  'Jorge Salazar', 'Sofia Cano', 'Emiliano Vera', 'Natalia Ibarra', 'Mateo Cruz',
  'Valeria Soto', 'Adrian Luna', 'Paola Mendez', 'Bruno Leal', 'Regina Flores',
  'Hector Pena', 'Daniela Mora', 'Alan Torres', 'Fernanda Solis', 'Carlos Vega',
].map((name, index) => ({
  id: `seller-${index + 1}`,
  full_name: name,
  business_name: ['Cafe Entre Clases', 'Punto Fresco', 'Dulce Parcial', 'Tacos del Campus', 'Bowl Med', 'Lunch FARQ'][index % 6],
  business_description: 'Negocio estudiantil con entregas coordinadas dentro del campus.',
  whatsapp: `52811234${String(5600 + index).padStart(4, '0')}`,
  role: 'seller',
  is_blocked: false,
  avatar_url: '',
  rating: Number((4.3 + (index % 7) * 0.08).toFixed(1)),
  reviews_count: 8 + index,
}));

const products = [
  ['Cafe frio vainilla', 'Bebidas', 'FIME', 35, 'Botella de 500 ml, entrega en explanada principal.', 'drink'],
  ['Agua mineral preparada', 'Bebidas', 'FACPyA', 28, 'Con limon, sal y chile. Entrega entre clases.', 'drink'],
  ['Matcha latte', 'Bebidas', 'FAPSI', 55, 'Preparado al momento, leche normal o deslactosada.', 'drink'],
  ['Tacos de guiso', 'Comidas', 'FACDyC', 18, 'Papa, picadillo y frijol. Pedido minimo 3 piezas.', 'food'],
  ['Bowl de pollo', 'Comidas', 'Medicina', 75, 'Arroz, pollo, verduras y aderezo chipotle.', 'food'],
  ['Sandwich artesanal', 'Comidas', 'FARQ', 58, 'Pan integral, jamon de pavo y queso panela.', 'food'],
  ['Brownies caseros', 'Postres', 'FCQ', 30, 'Brownie de chocolate con nuez, muy pedido en laboratorio.', 'dessert'],
  ['Galletas red velvet', 'Postres', 'Odontologia', 25, 'Paquete de 3 galletas suaves.', 'dessert'],
  ['Pay de limon individual', 'Postres', 'FACPyA', 40, 'Vaso individual refrigerado.', 'dessert'],
  ['Calculadora cientifica', 'Tecnologia', 'FIME', 280, 'Casio fx-991, poco uso, incluye funda.', 'tech'],
  ['Mouse inalambrico', 'Tecnologia', 'FARQ', 170, 'Silencioso, ideal para laptop.', 'tech'],
  ['Audifonos USB-C', 'Tecnologia', 'Medicina', 220, 'Con microfono, nuevos.', 'tech'],
  ['Libro Calculo Stewart', 'Libros', 'FIME', 430, 'Septima edicion, subrayado leve.', 'book'],
  ['Libro Derecho Romano', 'Libros', 'FACDyC', 260, 'Buen estado, usado un semestre.', 'book'],
  ['Manual Anatomia', 'Libros', 'Medicina', 390, 'Con separadores y notas utiles.', 'book'],
  ['Asesoria de Excel', 'Servicios', 'FACPyA', 120, 'Una hora, tablas dinamicas y formulas.', 'service'],
  ['Renders basicos', 'Servicios', 'FARQ', 250, 'Modelo simple y render para entrega.', 'service'],
  ['Asesoria de quimica', 'Servicios', 'FCQ', 150, 'Estequiometria, soluciones y equilibrio.', 'service'],
  ['Limpieza dental estudiante', 'Servicios', 'Odontologia', 90, 'Practica supervisada, agenda por WhatsApp.', 'service'],
  ['Guia psicometria', 'Libros', 'FAPSI', 180, 'Resumen impreso y digital para parcial.', 'book'],
];

const imageByType = {
  drink: '/carousel/slide-bebidas.svg',
  food: '/carousel/slide-comidas.svg',
  dessert: '/carousel/slide-postres.svg',
  tech: '/carousel/slide-tech.svg',
  book: '/carousel/slide-libros.svg',
  service: '/carousel/slide-servicios.svg',
};

export const DEMO_LISTINGS = products.map(([title, category, faculty, price, description, type], index) => {
  const seller = DEMO_SELLERS[index];
  const facultyRecord = DEMO_FACULTIES.find((item) => item.name === faculty);
  const categoryRecord = DEMO_CATEGORIES.find((item) => item.name === category);
  const rating = Number((4.2 + (index % 6) * 0.12).toFixed(1));
  const reviewCount = 3 + (index % 8);
  return {
    id: `demo-listing-${index + 1}`,
    seller_id: seller.id,
    faculty_id: facultyRecord.id,
    category_id: categoryRecord.id,
    title,
    description,
    price,
    whatsapp: seller.whatsapp,
    contact_note: 'Demo: acuerda punto de entrega dentro de la UANL.',
    status: 'active',
    created_at: new Date(Date.now() - index * 3600000).toISOString(),
    seller,
    faculty: facultyRecord,
    category: categoryRecord,
    images: [{ id: `img-${index + 1}`, url: imageByType[type] }],
    rating,
    reviews_count: reviewCount,
    reviews: [
      {
        id: `demo-review-${index + 1}-1`,
        listing_id: `demo-listing-${index + 1}`,
        reviewer_id: `demo-buyer-${index + 1}`,
        seller_id: seller.id,
        rating,
        comment: category === 'Servicios' ? 'Buen trato, respondio rapido y explico todo claro.' : 'Producto tal como lo describio, entrega rapida dentro de la facultad.',
        status: 'visible',
        created_at: new Date(Date.now() - (index + 2) * 86400000).toISOString(),
      },
      {
        id: `demo-review-${index + 1}-2`,
        listing_id: `demo-listing-${index + 1}`,
        reviewer_id: `demo-buyer-extra-${index + 1}`,
        seller_id: seller.id,
        rating: Math.max(4, Number((rating - 0.2).toFixed(1))),
        comment: 'Comunicacion clara por WhatsApp y punto de entrega facil de encontrar.',
        status: 'visible',
        created_at: new Date(Date.now() - (index + 5) * 86400000).toISOString(),
      },
    ],
    is_demo: true,
  };
});
