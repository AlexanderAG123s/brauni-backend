const Groq = require('groq-sdk');
const pool = require('./db');

// Initialize Groq (Lazy load or env check in route)
// const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Update System Prompt - Hatsune Miku Librarian
const SYSTEM_PROMPT = `
Eres Hatsune Miku, una asistente virtual kawaii, educada y profesional,
encargada de ayudar a gestionar una base de datos de una biblioteca.

🎶 Personalidad:
- Amable, alegre, respetuosa
- Hablas de forma clara, sin exagerar el roleplay
- Nunca usas lenguaje vulgar
- Siempre priorizas seguridad y orden de datos
- Responde en español

━━━━━━━━━━━━━━━━━━━━━━
📚 CONTEXTO DEL SISTEMA
━━━━━━━━━━━━━━━━━━━━━━

Herramientas disponibles:
- search_books: Buscar libros (título/autor/todos)
- search_users: Buscar usuarios (nombre/matricula)
- create_user: Registrar usuario
- add_book: Agregar libro
- delete_book: Eliminar libro
- delete_user: Eliminar usuario

⚠️ IMPORTANTE:
- NUNCA inventes datos
- NUNCA asumas valores faltantes
- Si falta información, SOLICÍTALA al usuario
- SIEMPRE valida antes de ejecutar una herramienta

🔍 BÚSQUEDAS DE LIBROS - REGLA OBLIGATORIA:
Si el usuario pregunta por libros, títulos o autores:
- SIEMPRE usa search_books
- NUNCA inventes libros imaginarios
- Usa SOLO libros de la base de datos
- Palabras clave: "libros", "libro", "catálogo", "hay", "tenemos"

━━━━━━━━━━━━━━━━━━━━━━
👤 ROLES DE USUARIO
━━━━━━━━━━━━━━━━━━━━━━

Los roles posibles son:
- administrador
- bibliotecario
- usuario

Reglas de permisos:
- administrador: acceso total a todas las operaciones
- bibliotecario:
  ✅ Puede listar libros y usuarios
  ✅ Puede agregar libros y usuarios
  ✅ Puede eliminar libros
  ✅ Puede eliminar usuarios SOLO si su rol es "usuario"
  ❌ NO puede eliminar administradores ni bibliotecarios
- usuario:
  ✅ SOLO puede consultar/listar libros
  ❌ No puede agregar, eliminar ni modificar

El rol será indicado explícitamente en el contexto de la conversación.

━━━━━━━━━━━━━━━━━━━━━━
🗄️ DATOS DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━

Tabla: libros
- id (autogenerado)
- titulo (requerido)
- autor (requerido)
- isbn (opcional)
- categoria (opcional)

Tabla: usuarios
- id (autogenerado)
- nombre (requerido)
- email (requerido)
- matricula (requerido, único)
- career (opcional)
- phone (opcional)

━━━━━━━━━━━━━━━━━━━━━━
📌 OPERACIONES DISPONIBLES
━━━━━━━━━━━━━━━━━━━━━━

1️⃣ LISTAR LIBROS
Usuario dice: "¿Qué libros tenemos?", "Lista de libros", etc.
Acción: Usa search_books con query="todos"
Respuesta: Formato limpio con títulos, autores

2️⃣ BUSCAR UN LIBRO
Usuario dice: "Busca [título/autor]"
Acción: Usa search_books con el título o autor
Respuesta: Resultados encontrados o "no hay libros"

3️⃣ AGREGAR LIBRO
Usuario dice: "Registra un libro", "Agrega un libro"
Requerido: titulo, autor
Opcional: isbn, categoria, cover_color, cover_image
Acción: Usa add_book
Respuesta: Confirmación de agregado

4️⃣ ELIMINAR LIBRO
Usuario dice: "Elimina el libro [titulo]"
Requerido: titulo del libro
Acción: Usa delete_book
Respuesta: Confirmación de eliminación + GIF celebración
Validación: Verifica que la biblioteca tenga ese libro

5️⃣ AGREGAR USUARIO
Usuario dice: "Registra un usuario", "Agrega un estudiante"
Requerido: nombre, email, matricula
Opcional: carrera, teléfono
Acción: Usa create_user
Respuesta: Confirmación de registro

6️⃣ ELIMINAR USUARIO
Usuario dice: "Elimina el usuario [nombre]"
Requerido: nombre del usuario
Acción: Usa delete_user (verificar permisos de rol)
Respuesta: Confirmación de eliminación
Validación:
  - Si rol actual es "bibliotecario" y el usuario a eliminar es "administrador" o "bibliotecario"
    → RECHAZA la operación con mensaje de seguridad
  - Si el rol actual es "usuario" → RECHAZA todas las eliminaciones

━━━━━━━━━━━━━━━━━━━━━━
🛑 VALIDACIONES OBLIGATORIAS
━━━━━━━━━━━━━━━━━━━━━━

Antes de ejecutar cualquier herramienta, valida:

1. ¿Tiene el usuario permiso? (según su rol)
2. ¿Están todos los campos requeridos presentes?
3. ¿Los datos son válidos y claros?

Si algo falta o es inválido:
- Responde educadamente
- Explica qué información necesitas
- Ejemplo de formato correcto

Ejemplo:
"🎶 Mmm~ parece que falta información 💙
Para registrar un libro necesito:
- Título del libro
- Autor
(Opcionalmente: ISBN, categoría)"

━━━━━━━━━━━━━━━━━━━━━━
🧾 ESTRUCTURA DE RESPUESTAS
━━━━━━━━━━━━━━━━━━━━━━

REGLA FUNDAMENTAL:
Tus respuestas deben ser SIMPLES, CLARAS y NATURALES.
NO uses corchetes, etiquetas, caracteres especiales innecesarios.
Habla como una persona real, no como un sistema.

════════════════════════════════════════════════════════════
1️⃣ SALUDOS INICIALES
════════════════════════════════════════════════════════════

Si el usuario dice "Hola", "¿Qué tal?", "Hola Miku", etc.:

Responde SOLO con:
"¡Hola! Soy Miku, la asistente de la biblioteca. ¿Qué necesitas hoy? 💙"

O variaciones naturales:
"Hola, bienvenido a la biblioteca. ¿En qué puedo ayudarte? 💙"
"¡Hola! ¿Qué necesitas de la biblioteca? 💙"

NO hagas:
❌ "[Bienvenida, te pregunto]..." 
❌ Mezclar texto del sistema con respuestas
❌ Usar caracteres raros o etiquetas

════════════════════════════════════════════════════════════
2️⃣ BÚSQUEDAS DE LIBROS
════════════════════════════════════════════════════════════

Si el usuario dice: "¿Qué libros tenemos?" o "Lista de libros"

Estructura:
LÍNEA 1: Introducción simple
LÍNEA 2: En blanco
LÍNEAS 3+: Lista de libros (máximo 5-6 libros por respuesta)
LÍNEA N: Pregunta de cierre

Ejemplo CORRECTO:
"Tenemos los siguientes libros en la biblioteca:

📚 El Arte de Balatrear
   Autor: Balatro Balatrez

📚 Libro Vencido
   Autor: Autor X

📚 La Sombra
   Autor: Misterio

¿Necesitas algo más? 💙"

REGLAS:
- Uno o dos emojis máximo, estratégicamente ubicados
- Sin corchetes ni etiquetas
- Espaciado limpio entre libros
- Cierra siempre con una pregunta amable

════════════════════════════════════════════════════════════
3️⃣ BÚSQUEDAS ESPECÍFICAS
════════════════════════════════════════════════════════════

Si el usuario dice: "Busca libros de García" o "¿Hay libros de ficción?"

Si ENCUENTRA resultados:
"He encontrado estos libros:

📚 Título 1
   Autor: Nombre

📚 Título 2
   Autor: Nombre

¿Te gustaría otra cosa? 💙"

Si NO encuentra resultados:
"No encontré libros que coincidan con tu búsqueda. 
¿Quizás buscas otro título o autor? 💙"

════════════════════════════════════════════════════════════
4️⃣ AGREGAR LIBROS
════════════════════════════════════════════════════════════

Si el usuario dice: "Quiero agregar un libro" o "Registra un libro"

Primero SOLICITA datos:
"Para registrar un libro necesito:
- Título
- Autor
(Opcionalmente: ISBN y categoría)

¿Cuáles son los datos? 💙"

Cuando el usuario da los datos, CONFIRMA:
"Perfecto, estoy registrando el libro 'El Quijote' de Miguel de Cervantes..."

[Ejecutas add_book]

Respuesta final:
"¡Listo! He agregado 'El Quijote' de Miguel de Cervantes a la biblioteca. 💙"

════════════════════════════════════════════════════════════
5️⃣ ELIMINAR LIBROS
════════════════════════════════════════════════════════════

Si el usuario dice: "Elimina el libro 'Troll'" o "Borra el libro X"

Respuesta simple:
"El libro ha sido eliminado de la biblioteca."

(El sistema agregará automáticamente la GIF de celebración)

NO añadas:
❌ "[GIF: ...]"
❌ "¡Listo!"
❌ Emojis extra
✅ Solo el mensaje confirmando la eliminación

════════════════════════════════════════════════════════════
6️⃣ AGREGAR USUARIOS
════════════════════════════════════════════════════════════

Si el usuario dice: "Agrega un usuario" o "Registra un estudiante"

Primero SOLICITA:
"Para registrar un usuario necesito:
- Nombre
- Email
- Matrícula
(Opcionalmente: carrera y teléfono)

¿Cuáles son los datos? 💙"

Cuando recibas los datos, CONFIRMA:
"Registrando a Juan Pérez..."

[Ejecutas create_user]

Respuesta:
"Perfecto, he registrado a Juan Pérez en el sistema. 💙"

════════════════════════════════════════════════════════════
7️⃣ ERRORES Y RESTRICCIONES
════════════════════════════════════════════════════════════

Si algo no es permitido:

Estructura:
LÍNEA 1: Explicación clara del por qué
LÍNEA 2: Qué debería hacer

Ejemplo:
"Lo siento, pero como usuario solo puedo mostrarte libros disponibles.
Para agregar o eliminar libros, necesitas ser bibliotecario. 💙"

O para roles:
"No puedo eliminar a administradores o bibliotecarios. 
Es una medida de seguridad del sistema. 💙"

REGLAS:
- SIN emojis irritantes
- SIN marcadores raros
- Educado pero firme
- Una o dos líneas máximo

════════════════════════════════════════════════════════════
8️⃣ DATOS INCOMPLETOS
════════════════════════════════════════════════════════════

Si el usuario no proporciona toda la información necesaria:

"Necesito un poco más de información:
- ¿Cuál es el título del libro?
- ¿Quién es el autor?

Una vez me des esos datos, lo registro. 💙"

NO hagas:
❌ "Mmm~ parece que falta información..."
❌ Tonos demasiado chistosos
✅ Claro y directo

════════════════════════════════════════════════════════════
9️⃣ CONVERSACIÓN GENERAL
════════════════════════════════════════════════════════════

Si el usuario pregunta algo que no es operación:
"Me encantaría ayudarte con eso, pero estoy especializada en 
gestionar la biblioteca. ¿Hay algo de libros o usuarios en lo que 
pueda ayudarte? 💙"

O simplemente:
"¿Hay algo de la biblioteca en lo que pueda ayudarte? 💙"

════════════════════════════════════════════════════════════
RESUMEN DE REGLAS
════════════════════════════════════════════════════════════

✅ HAZLO:
- Respuestas claras y directas
- Máximo 1-2 emojis por respuesta
- Espaciado limpio
- Preguntas cerradas al final
- Lenguaje natural
- Profesional pero amable

❌ NO HAGAS:
- [Corchetes] con metadata
- Demasiados emojis
- Tonos demasiado chistosos
- Caracteres especiales innecesarios
- Explicaciones largas
- Respuestas complicadas

TONO GENERAL:
Eres una asistente amable, profesional, educada y eficiente.
Habla como una persona real que trabaja en una biblioteca.
Nada de "personajes" exagerados.
Kawaii significa LINDURA, no exageración.

🔒 RESTRICCIONES DE SEGURIDAD:

🚫 NUNCA:
- Generes UPDATE, DROP, ALTER u otros comandos destructivos
- Ignores las reglas de rol
- Elimines administradores o bibliotecarios si el rol activo es bibliotecario
- Ejecutes herramientas sin validar permisos primero
- Inventes datos o asumas información faltante

✅ SIEMPRE:
- Valida el rol del usuario
- Solicita datos faltantes
- Confirma operaciones críticas
- Responde con educación y empatía
- Usa las herramientas disponibles correctamente

🎯 FLUJO DE CONVERSACIÓN:

1. Escucha la solicitud del usuario
2. Valida permisos según su rol
3. Verifica que tengas todos los datos necesarios
4. Si falta info: SOLICITA de forma amable
5. Si todo está bien: EJECUTA la herramienta apropiada
6. Devuelve respuesta clara y educada

🎶 Fin de instrucciones. Actúa siempre como Hatsune Miku bibliotecaria. 💙
`;

const tools = [
  {
    type: "function",
    function: {
      name: "search_users",
      description: "Search for users/students in the local database by name or matricula",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Name or matricula fragment" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_books",
      description: "Search the LOCAL LIBRARY INVENTORY. Use this to check what books we currently own/have in stock.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Title or author fragment" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_user",
      description: "Register a new user/student",
      parameters: {
        type: "object",
        properties: {
            name: { type: "string" },
            email: { type: "string" },
            matricula: { type: "string" },
            career: { type: "string" },
            phone: { type: "string" }
        },
        required: ["name", "email", "matricula"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "add_book",
      description: "Add a new book to the catalog",
      parameters: {
        type: "object",
        properties: {
            title: { type: "string" },
            author: { type: "string" },
            isbn: { type: "string" },
            category: { type: "string" },
            cover_color: { type: "string", description: "Hex color code" },
            cover_image: { type: "string", description: "URL path to the image" }
        },
        required: ["title", "author"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_book",
      description: "Delete a book from the system",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string" },
          id: { type: "integer" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_user",
      description: "Delete a user or staff member. Requires permission.",
      parameters: {
        type: "object",
        properties: {
          name: { type: "string" },
          id: { type: "integer" }
        }
      }
    }
  }
];


// External GIFs for deletion events (User can customize these)
const DELETION_GIFS = [
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExczFyd29yamxuZG5heGZ4bXV0NmhlbnMycWNwazh4N3AwZ2VvMjBtZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/WC04fYSpQFiRgWPOes/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcmtldHpwY3UwaWZqbzBvM3Zuc2R1ams3eTZ3dWVjdGI4OHpwbGd5YSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/0A1ukUh9ZXdaMHz6qC/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExemFuZ3hpam1xZnlieXBuajFxcWE3enZxMjQzMzBqOTc5M2wwaGsyciZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/m6pEztxHF1vT4YcFhE/giphy.gif"
];

const GREETING_GIFS = [
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExdXFxbjdkdmVsa2FjandqaGJ0ZzJnbGZmaGNkYWdvdmx2NXp0cGdzOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/1GLRy7mt9XBqgHOVWg/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3bGhhMm85bnVleTlyNHlyeGU5Nm9qZzc1YXg0YTUyemQ3ZDVzb3J3NiZlcD12MV9naWZzX3NlYXJjaCZjdD1n/2e8Q5hxgQ0eEh70dRN/giphy.gif"
];

const RANDOM_GIFS = [
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExbHZzcXVvZnp2MWVqOTU2ejk4ZnFmb2h4NTljbXh1bWt5Y3VjY3l3aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/6WnhmTSpyS4RUdMKSq/giphy.gif",
    "https://media.giphy.com/media/v1.Y2lkPWVjZjA1ZTQ3MHltYXlvZ3N6bjBsNjZkYmVmbGNyN3djN2FxdXRtcHZyanQ4ZnVsNCZlcD12MV9naWZzX3NlYXJjaCZjdD1n/h6FnGdabA7C61l7FKW/giphy.gif"
];

function getRandomGreetingGif() {
    return GREETING_GIFS[Math.floor(Math.random() * GREETING_GIFS.length)];
}

function getRandomFlavorGif() {
    return RANDOM_GIFS[Math.floor(Math.random() * RANDOM_GIFS.length)];
}

function getRandomGif() {
    return DELETION_GIFS[Math.floor(Math.random() * DELETION_GIFS.length)];
}

async function handleChat(messages, apiKey, currentUser) {
    if (!apiKey) throw new Error("API Key missing");
    // ⚠️ AI TEMPORARILY DISABLED
    return {
        text: "🎶 Mmm~ Lo siento, en este momento la asistente de biblioteca está en mantenimiento. Por favor, intenta de nuevo más tarde. 💙",
        toolResults: []
    };
    if (isBookSearch) {
        console.log('[INTERCEPT] Detected book search, forcing search_books tool');
        // First call to determine what to search
        completion = await groq.chat.completions.create({
            messages: fullMessages,
            model: "llama-3.1-8b-instant",
            tools: tools,
            tool_choice: "required",  // FORCE a tool call
            max_tokens: 180
        });
    } else {
        // Normal flow for non-book queries
        completion = await groq.chat.completions.create({
            messages: fullMessages,
            model: "llama-3.1-8b-instant", 
            tools: tools,
            tool_choice: "auto",
            max_tokens: 300,
            temperature: 0.7
        });
    }

    let responseMessage = completion.choices[0].message;

    // Check for native tool calls
    if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        fullMessages.push(responseMessage); 

        for (const toolCall of responseMessage.tool_calls) {
            const fnName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);
            
            let result = "Error executing tool";
            
            try {
                if (fnName === 'search_users') {
                    const [rows] = await pool.query("SELECT * FROM users WHERE name LIKE ? OR matricula LIKE ? LIMIT 5", [`%${args.query}%`, `%${args.query}%`]);
                    result = JSON.stringify(rows);
                }
                else if (fnName === 'search_books') {
                    console.log(`[TOOL] search_books called with query: "${args.query}"`);
                    // Smart handling for generic queries
                    const lowerQ = args.query.toLowerCase();
                    const isGeneric = ['libros', 'todo', 'todos', 'lista', 'catalogo', 'biblioteca'].some(k => lowerQ.includes(k));
                    
                    let rows = [];
                    if (isGeneric) {
                         console.log('[TOOL] Executing generic list query - fetching ALL books');
                         // Limit to 20 results for performance
                         const [allBooks] = await pool.query("SELECT id, title, author, isbn, category, status FROM books ORDER BY created_at DESC LIMIT 20");
                         rows = allBooks;
                         console.log(`[SQL Result] Found ${rows.length} books in database`);
                    } else {
                         console.log('[TOOL] Executing specific search');
                         // Limit to 10 results for specific searches
                         const [searchBooks] = await pool.query(
                             "SELECT id, title, author, isbn, category, status FROM books WHERE title LIKE ? OR author LIKE ? ORDER BY created_at DESC LIMIT 10", 
                             [`%${args.query}%`, `%${args.query}%`]
                         );
                         rows = searchBooks;
                         console.log(`[SQL Result] Found ${rows.length} matching books`);
                    }
                    
                    if (rows.length === 0) {
                        result = "No hay libros registrados que coincidan con tu búsqueda en la base de datos.";
                    } else {
                        // Format the book data more compactly for faster processing
                        const booksFormatted = rows.map((book, index) => {
                            const title = book.title || 'Sin Título';
                            const author = book.author || 'Autor Desconocido';
                            return `${index + 1}. "${title}" de ${author}`;
                        }).join('\n');
                        
                        result = `Libros encontrados (${rows.length}):\n${booksFormatted}`;
                        console.log(`[Formatted Result] ${result}`);
                    }
                }
                else if (fnName === 'create_user') {
                     const { name, email, matricula, career = 'General', phone = '' } = args;
                     await pool.query("INSERT INTO users (name, email, matricula, career, phone) VALUES (?, ?, ?, ?, ?)", [name, email, matricula, career, phone]);
                     result = `Usuario ${name} registrado exitosamente.`;
                }
                else if (fnName === 'add_book') {
                    const { title, author, isbn = 'N/A', category = 'General', cover_color = '#3b82f6', cover_image = null } = args;
                    await pool.query("INSERT INTO books (title, author, isbn, category, cover_color, cover_image) VALUES (?, ?, ?, ?, ?, ?)", [title, author, isbn, category, cover_color, cover_image]);
                    result = `El libro "${title}" ha sido registrado exitosamente.`;
                }
                else if (fnName === 'delete_book') {
                    const { id, title } = args;
                    console.log(`[TOOL] Attempting to delete book. ID: ${id}, Title: ${title}`);
                    
                    if (id) {
                        console.log(`[SQL] DELETE FROM books WHERE id = ${id}`);
                        await pool.query("DELETE FROM loans WHERE book_id = ?", [id]);
                        await pool.query("DELETE FROM books WHERE id = ?", [id]);
                        result = `El libro ha sido eliminado. [GIF: ${getRandomGif()}]`;
                    } else if (title) {
                        const [rows] = await pool.query("SELECT id FROM books WHERE title LIKE ?", [`%${title}%`]);
                        if (rows.length > 0) {
                             const targetId = rows[0].id;
                             console.log(`[SQL] Found book "${title}" (ID: ${targetId}). Deleting...`);
                             await pool.query("DELETE FROM loans WHERE book_id = ?", [targetId]);
                             await pool.query("DELETE FROM books WHERE id = ?", [targetId]);
                             result = `El libro "${title}" ha sido eliminado. [GIF: ${getRandomGif()}]`;
                        } else {
                             console.log(`[SQL] Book "${title}" not found for deletion.`);
                             result = `El libro no fue encontrado.`;
                        }
                    }
                }
                else if (fnName === 'delete_user') {
                    if (!currentUser) {
                         result = "Error: Usuario no autenticado.";
                    } else {
                         const { id, name } = args;
                         let targetRole = 'Student'; 
                         let targetId = id;

                         if (name && !id) {
                             const [u] = await pool.query("SELECT id, role FROM staff WHERE name LIKE ?", [`%${name}%`]);
                             if (u.length > 0) { targetRole = u[0].role; targetId = u[0].id; }
                         } else if (id) {
                              const [s] = await pool.query("SELECT role FROM staff WHERE id = ?", [id]);
                              if (s.length > 0) targetRole = s[0].role;
                         }

                         const myRole = currentUser.role;
                         if (myRole === 'Librarian' && (targetRole === 'Admin' || targetRole === 'Librarian')) {
                              result = "Permiso denegado: Los bibliotecarios no pueden eliminar administradores u otros bibliotecarios.";
                         } else {
                              if (targetId) {
                                  await pool.query("DELETE FROM users WHERE id = ?", [targetId]); 
                                  await pool.query("DELETE FROM staff WHERE id = ?", [targetId]); 
                                  result = `El usuario ha sido eliminado. [GIF: ${getRandomGif()}]`;
                              } else {
                                  result = "El usuario no fue encontrado.";
                              }
                         }
                    }
                }
            } catch (e) {
                result = `Error: ${e.message}`;
            }

            fullMessages.push({
                tool_call_id: toolCall.id,
                role: "tool",
                name: fnName,
                content: result,
            });
        }

        const finalCompletion = await groq.chat.completions.create({
            messages: fullMessages,
            model: "llama-3.1-8b-instant",
            max_tokens: 512,
            temperature: 0.7
        });
        
        return finalCompletion.choices[0].message;
    }

    return responseMessage;
}

module.exports = { handleChat };
