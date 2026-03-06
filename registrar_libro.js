document.getElementById("formLibro").addEventListener("submit", async function(e){

e.preventDefault();

const libro = {

titulo: document.getElementById("titulo").value,
autor: document.getElementById("autor").value,
genero: document.getElementById("genero").value,
isbn: document.getElementById("isbn").value,
cantidad: document.getElementById("cantidad").value

};

try{

const res = await fetch("http://localhost:3000/libros",{

method: "POST",

headers:{
"Content-Type":"application/json"
},

body: JSON.stringify(libro)

});

const data = await res.json();

alert("Libro registrado correctamente");

window.location.href = "consultar_titulos.html";

}catch(error){

alert("Error al registrar el libro");

}

});