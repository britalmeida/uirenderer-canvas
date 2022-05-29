<template>
  <div class="home">
    <Shapes />
    <Images />
  </div>
</template>

<script>
import Shapes from '@/components/Shapes'
import Images from '@/components/Images';

export default {
  name: 'HomeView',
  components: {
    Images,
    Shapes
  }
}
</script>
