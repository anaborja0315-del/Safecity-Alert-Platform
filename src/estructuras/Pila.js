// Pila (stack) implementada con nodos enlazados.
// Complejidades: apilar O(1) (O(n) solo si se descarta el mas antiguo por limite),
// desapilar O(1), cima O(1), estaVacia O(1), tamanio O(1).
// Se usa en SafeCity para el "Undo delete" de alertas (src/routes/alertas.js).

class NodoPila {
  constructor(valor) {
    this.valor = valor;
    this.siguiente = null;
  }
}

class Pila {
  constructor(limite = 10) {
    this.tope = null;
    this.tam = 0;
    this.limite = limite;
  }

  // Apila un elemento; si se llena, descarta el mas antiguo (el del fondo).
  apilar(x) {
    if (this.limite > 0 && this.tam >= this.limite) {
      // Descartar el nodo mas antiguo (fondo de la pila).
      if (this.tam === 1) {
        this.tope = null;
      } else {
        let actual = this.tope;
        while (actual.siguiente && actual.siguiente.siguiente) {
          actual = actual.siguiente;
        }
        actual.siguiente = null;
      }
      this.tam--;
    }

    const nodo = new NodoPila(x);
    nodo.siguiente = this.tope;
    this.tope = nodo;
    this.tam++;
  }

  // Desapila y devuelve el elemento del tope (o null si esta vacia).
  desapilar() {
    if (this.estaVacia()) {
      return null;
    }
    const valor = this.tope.valor;
    this.tope = this.tope.siguiente;
    this.tam--;
    return valor;
  }

  // Devuelve el elemento del tope sin desapilarlo (o null si esta vacia).
  cima() {
    if (this.estaVacia()) {
      return null;
    }
    return this.tope.valor;
  }

  estaVacia() {
    return this.tope === null;
  }

  tamanio() {
    return this.tam;
  }
}

module.exports = Pila;