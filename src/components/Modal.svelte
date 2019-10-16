<script>
  let showModal = false
  export let buttonColor = 'bg-blue-500'
  export let buttonName = 'Добавить'

  const handleClose = _showModal => {
    showModal = _showModal
  }

  let buttonHover = () => {
    let clr = buttonColor.split('-')
    clr[2] = '700'

    return clr.join('-')
  }

  let height
  let width
</script>

<slot name="button">
  <nu-btn class="{buttonColor} hover:{buttonHover()} text-white font-bold py-2 px-4 rounded" on:click={() => (showModal = true)}>{buttonName}</nu-btn>
</slot>

<svelte:window bind:innerHeight={height} bind:innerWidth={width} />
{#if showModal}
  <nu-block background="rgba(0,0,0,.5)" place="cover" on:click={() => (showModal = false)} z="front" shadow />
  <nu-block place="inside fixed" z="front" shadow>
    <slot handle={handleClose} />
  </nu-block>
{/if}
