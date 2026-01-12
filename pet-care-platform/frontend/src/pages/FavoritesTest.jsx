import { useState, useEffect } from 'react'
import { useFavoritesStore } from '../store/favoritesStore'

function FavoritesTest() {
  const [testData, setTestData] = useState('Loading...')

  useEffect(() => {
    console.log('FavoritesTest mounted')
    setTestData('Component loaded successfully')

    const { products, courses } = useFavoritesStore.getState()
    console.log('Products:', products.length, 'Courses:', courses.length)
  }, [])

  return (
    <div>
      <h1>Favorites Test</h1>
      <p>{testData}</p>
    </div>
  )
}

export default FavoritesTest