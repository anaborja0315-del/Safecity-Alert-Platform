// Tabla hash con encadenamiento para resolver colisiones.
// Complejidades promedio: poner O(1), obtener O(1), eliminar O(1), existe O(1), tamanio O(1).
// En el peor caso (muchas colisiones) es O(n).
// Se usa en SafeCity para indexar usuarios por email (src/routes/usuarios.js).

class TablaHash {
  constructor(tamano = 16) {
    this.tamano = tamano;
    this.cubetas = new Array(tamano);
    for (let i = 0; i < tamano; i++) {
      this.cubetas[i] = [];
    }
    this.cantidad = 0;
  }

  calcularIndice(clave) {
    let suma = 0;
    const texto = String(clave);
    for (let i = 0; i < texto.length; i++) {
      suma += texto.charCodeAt(i);
    }
    return suma % this.tamano;
  }

  poner(clave, valor) {
    const indice = this.calcularIndice(clave);
    const cubeta = this.cubetas[indice];
    for (let i = 0; i < cubeta.length; i++) {
      if (cubeta[i].clave === clave) {
        cubeta[i].valor = valor;
        return;
      }
    }
    cubeta.push({ clave, valor });
    this.cantidad++;
  }

  obtener(clave) {
    const indice = this.calcularIndice(clave);
    const cubeta = this.cubetas[indice];
    for (let i = 0; i < cubeta.length; i++) {
      if (cubeta[i].clave === clave) {
        return cubeta[i].valor;
      }
    }
    return null;
  }

  eliminar(clave) {
    const indice = this.calcularIndice(clave);
    const cubeta = this.cubetas[indice];
    for (let i = 0; i < cubeta.length; i++) {
      if (cubeta[i].clave === clave) {
        cubeta.splice(i, 1);
        this.cantidad--;
        return true;
      }
    }
    return false;
  }

  existe(clave) {
    return this.obtener(clave) !== null;
  }

  tamanio() {
    return this.cantidad;
  }
}

module.exports = TablaHash;