// Cola (queue) implementada con nodos enlazados y referencias a frente y final.
// Complejidades: encolar O(1), desencolar O(1), frente O(1), estaVacia O(1),
// tamanio O(1), aArreglo O(n).
// Se usa en SafeCity para la cola de revision de alertas nuevas (src/routes/alertas.js).

class NodoCola {
  constructor(valor) {
    this.valor = valor;
    this.siguiente = null;
  }
}

class Cola {
  constructor() {
    this.frenteNodo = null;
    this.finalNodo = null;
    this.tam = 0;
  }

  encolar(x) {
    const nodo = new NodoCola(x);
    if (this.finalNodo === null) {
      this.frenteNodo = nodo;
      this.finalNodo = nodo;
    } else {
      this.finalNodo.siguiente = nodo;
      this.finalNodo = nodo;
    }
    this.tam++;
  }

  desencolar() {
    if (this.estaVacia()) {
      return null;
    }
    const valor = this.frenteNodo.valor;
    this.frenteNodo = this.frenteNodo.siguiente;
    if (this.frenteNodo === null) {
      this.finalNodo = null;
    }
    this.tam--;
    return valor;
  }

  frente() {
    if (this.estaVacia()) {
      return null;
    }
    return this.frenteNodo.valor;
  }

  estaVacia() {
    return this.frenteNodo === null;
  }

  tamanio() {
    return this.tam;
  }

  aArreglo() {
    const resultado = [];
    let actual = this.frenteNodo;
    while (actual !== null) {
      resultado.push(actual.valor);
      actual = actual.siguiente;
    }
    return resultado;
  }
}

module.exports = Cola;