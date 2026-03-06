async function cargarLibros(){

const res = await fetch("http://localhost:3000/libros");

const libros = await res.json();

const tabla = document.getElementById("tablaLibros");

tabla.innerHTML="";

libros.forEach(libro =>{

tabla.innerHTML += `
<tr>
<td>${libro.titulo}</td>
<td>${libro.autor}</td>
<td>${libro.genero}</td>
<td>${libro.isbn}</td>
<td>${libro.cantidad}</td>
<td>${libro.disponibles}</td>
<td><button>ver</button></td>
<td><button>ver</button></td>
<td><button>editar</button></td>
</tr>
`;

});

}

cargarLibros();