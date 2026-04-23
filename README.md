# Biblioteca "Alfonso Reyes" — PW2 053 EQ8

Aplicación web de administración de biblioteca: gestión de libros, miembros, préstamos, listas de espera y multas.

## Integrantes

- Ana Cecilia López Villagrán
- Mario Enrique Ávila Ortiz
- René Samuel Martínez Torres
- Karol Joanna Carreño Páez

## Stack

- **Back End:** Node.js + Express 5 + Prisma ORM + MySQL
- **Auth:** JWT + bcrypt
- **Validación:** Zod (independiente del front)
- **Front End:** HTML + CSS + Bootstrap + JS vanilla

## Estructura del repositorio

```
.
├── backend/
│   ├── prisma/
│   │   └── schema.prisma           # 6 tablas: user, book, loan, loanitem, hold, fine, log
│   ├── src/
│   │   ├── server.js               # Entry point
│   │   ├── prisma.js               # Cliente Prisma
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.js  # Validación JWT
│   │   │   └── error.middleware.js # 404 + error handler
│   │   ├── modules/
│   │   │   ├── books/
│   │   │   ├── users/
│   │   │   ├── loans/
│   │   │   ├── holds/
│   │   │   ├── fines/
│   │   │   └── reports/            # 5 reportes
│   │   ├── routes/
│   │   └── utils/
│   │       └── logger.js           # Logs a archivo + BD
│   ├── logs/                       # Archivos de log generados
│   ├── .env.example
│   └── package.json
└── Biblioteca/                     # Front End estático
    ├── index.html
    ├── login.html
    ├── register.html
    ├── admin/
    ├── usuario/
    ├── css/
    └── js/
```

## Instalación y ejecución

### Back End

```bash
cd backend
npm install
cp .env.example .env       # configura DATABASE_URL y JWT_SECRET
npx prisma db push         # sincroniza el schema con tu MySQL
npm run dev                # arranca con nodemon en :3000
```

### Front End

Sirve la carpeta `Biblioteca/` con cualquier servidor estático (Live Server de VSCode, `npx serve`, etc.).

## Endpoints

Todas las rutas (excepto `/auth/*` y `/health`) requieren header:
```
Authorization: Bearer <token>
```

### Auth (público)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/auth/register` | Registra un nuevo miembro |
| POST | `/auth/login` | Login, devuelve JWT |

### Books
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/books` | Lista todos |
| GET | `/books/:id` | Obtiene uno |
| POST | `/books` | Crea libro |
| PUT | `/books/:id` | Actualiza libro |
| DELETE | `/books/:id` | Elimina libro |

### Users
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/users` | Lista todos |
| POST | `/users` | Crea usuario |
| PUT | `/users/:id` | Actualiza usuario |
| DELETE | `/users/:id` | Elimina usuario |

### Loans
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/loans` | Lista todos |
| POST | `/loans` | Crea préstamo (descuenta stock) |
| PUT | `/loans/:id/return` | Marca como devuelto (regresa stock) |

### Holds (lista de espera)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/holds` | Lista todas las esperas |
| GET | `/holds/:id` | Obtiene una |
| POST | `/holds` | Mete a usuario en la fila |
| PUT | `/holds/:id` | Cambia estado o posición |
| DELETE | `/holds/:id` | Cancela |

### Fines (multas)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/fines` | Lista todas |
| GET | `/fines/:id` | Obtiene una |
| POST | `/fines` | Crea multa |
| PUT | `/fines/:id` | Actualiza (incluye marcar como pagada) |
| DELETE | `/fines/:id` | Elimina |

### Reports (4+ consultas que cruzan tablas)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/reports/most-borrowed-books` | Top de libros más prestados |
| GET | `/reports/users-with-most-fines` | Usuarios con más multas |
| GET | `/reports/overdue-loans` | Préstamos vencidos |
| GET | `/reports/dashboard` | Resumen general del sistema |
| GET | `/reports/user-activity/:userId` | Actividad completa por usuario |

## Modelo de datos (6 tablas)

- **user** — miembros y administradores
- **book** — catálogo de libros
- **loan** — préstamos (cabecera)
- **loanitem** — detalle de préstamos (items)
- **hold** — lista de espera
- **fine** — multas
- **log** — bitácora del sistema
