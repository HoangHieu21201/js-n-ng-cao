// src/stores/cart.js
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useCartStore = defineStore('cart', () => {
  const items = ref([])

  function addToCart(product) {
    const existingItem = items.value.find(i => i.id === product.id)
    if (existingItem) {
      existingItem.quantity++
    } else {
      items.value.push({ ...product, quantity: 1 })
    }
  }

  function removeItem(id) {
    items.value = items.value.filter(i => i.id !== id)
  }

  return { items, addToCart, removeItem }
})