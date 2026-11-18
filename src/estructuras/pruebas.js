const Pila = require('./Pila');
const Cola = require('./Cola');
const TablaHash = require('./TablaHash');

function prueba(nombre, fn) {
  try {
    fn();
    console.log('OK - ' + nombre);
  } catch (e) {
    console.log('FAIL - ' + nombre + ': ' + e.message);
  }
}

// ===== PILA =====
prueba('Pila inicia vacia', () => {
  const p = new Pila();
  console.assert(p.estaVacia() === true, 'debe estar vacia');
  if (!p.estaVacia()) throw new Error('no esta vacia');
  console.assert(p.tamanio() === 0, 'tamanio 0');
  if (p.tamanio() !== 0) throw new Error('tamanio incorrecto');
});

prueba('Pila apilar/desapilar', () => {
  const p = new Pila();
  p.apilar(1);
  p.apilar(2);
  p.apilar(3);
  console.assert(p.tamanio() === 3, 'tamanio 3');
  console.assert(p.cima() === 3, 'cima 3');
  console.assert(p.desapilar() === 3, 'desapila 3');
  console.assert(p.desapilar() === 2, 'desapila 2');
  console.assert(p.tamanio() === 1, 'tamanio 1');
  if (p.tamanio() !== 1) throw new Error('tamanio');
});

prueba('Pila vacia desapilar retorna null', () => {
  const p = new Pila();
  console.assert(p.desapilar() === null, 'null');
  console.assert(p.cima() === null, 'null');
  if (p.desapilar() !== null) throw new Error('no null');
});

prueba('Pila limite 10 descarta el mas antiguo', () => {
  const p = new Pila(10);
  for (let i = 1; i <= 11; i++) p.apilar(i);
  console.assert(p.tamanio() === 10, 'tamanio 10');
  if (p.tamanio() !== 10) throw new Error('tamanio');
  // El mas reciente queda en la cima
  console.assert(p.cima() === 11, 'cima 11');
  if (p.cima() !== 11) throw new Error('cima');
});

// ===== COLA =====
prueba('Cola inicia vacia', () => {
  const c = new Cola();
  console.assert(c.estaVacia() === true, 'vacia');
  if (!c.estaVacia()) throw new Error('no vacia');
  console.assert(c.tamanio() === 0, '0');
});

prueba('Cola encolar/desencolar', () => {
  const c = new Cola();
  c.encolar('a');
  c.encolar('b');
  console.assert(c.tamanio() === 2, '2');
  console.assert(c.frente() === 'a', 'frente a');
  console.assert(c.desencolar() === 'a', 'desencola a');
  console.assert(c.desencolar() === 'b', 'desencola b');
  console.assert(c.estaVacia() === true, 'vacia');
  if (!c.estaVacia()) throw new Error('no vacia');
});

prueba('Cola vacia desencolar retorna null', () => {
  const c = new Cola();
  console.assert(c.desencolar() === null, 'null');
  console.assert(c.frente() === null, 'null');
  if (c.desencolar() !== null) throw new Error('no null');
});

prueba('Cola aArray orden correcto', () => {
  const c = new Cola();
  c.encolar(1);
  c.encolar(2);
  c.encolar(3);
  const arr = c.aArray();
  console.assert(arr.length === 3, 'len');
  console.assert(arr[0] === 1 && arr[1] === 2 && arr[2] === 3, 'orden');
  if (!(arr[0] === 1 && arr[1] === 2 && arr[2] === 3)) throw new Error('orden');
});

// ===== TABLA HASH =====
prueba('TablaHash poner/obtener/existe', () => {
  const t = new TablaHash();
  t.poner('email1@test.com', { id: 1 });
  console.assert(t.existe('email1@test.com') === true, 'existe');
  console.assert(t.obtener('email1@test.com').id === 1, 'obtener');
  console.assert(t.tamanio() === 1, 'tamanio');
  if (t.tamanio() !== 1) throw new Error('tamanio');
});

prueba('TablaHash actualizar clave existente', () => {
  const t = new TablaHash();
  t.poner('k', 1);
  t.poner('k', 2);
  console.assert(t.obtener('k') === 2, 'actualizado');
  console.assert(t.tamanio() === 1, 'tamanio 1');
  if (t.tamanio() !== 1) throw new Error('tamanio');
});

prueba('TablaHash eliminar y reutilizar clave', () => {
  const t = new TablaHash();
  t.poner('k', 'v');
  console.assert(t.eliminar('k') === true, 'eliminado');
  console.assert(t.existe('k') === false, 'no existe');
  console.assert(t.eliminar('k') === false, 'false');
  t.poner('k', 'nuevo');
  console.assert(t.obtener('k') === 'nuevo', 'reutilizado');
  if (t.obtener('k') !== 'nuevo') throw new Error('reutilizado');
});

prueba('TablaHash colisiones (encadenamiento)', () => {
  // Fuerza colisiones usando tamano 1
  const t = new TablaHash(1);
  t.poner('a', 1);
  t.poner('b', 2);
  t.poner('c', 3);
  console.assert(t.tamanio() === 3, 'tamanio 3');
  console.assert(t.obtener('a') === 1, 'a');
  console.assert(t.obtener('b') === 2, 'b');
  console.assert(t.obtener('c') === 3, 'c');
  if (t.obtener('b') !== 2) throw new Error('colision');
});

console.log('Pruebas finalizadas.');