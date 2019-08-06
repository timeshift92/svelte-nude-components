<script>
import { fade } from "svelte/transition";
  let showModal = false;
  export let buttonColor = "bg-blue-500";
  export let buttonName = "Добавить";

  const handleClose = _showModal => {
    showModal = _showModal;
  };

  let buttonHover = () => {
    let clr = buttonColor.split("-");
    clr[2] = "700";

    return clr.join("-");
  };

	
let height;
let width;
</script>
<slot name="button">
  <nu-btn
    class="{buttonColor} hover:{buttonHover()} text-white font-bold py-2 px-4
    rounded"
    on:click={() => (showModal = true)}>
    {buttonName}
  </nu-btn>
</slot>

<svelte:window  bind:innerHeight={height} bind:innerWidth={width}/>
{#if showModal}

<nd-theme name="modal" color="#333" background-color="#00000057" special-color="#3366ff" border-color="#ddd">
</nd-theme>
<nu-flex content="center" items="center" class="inset-0 fixed z-10"   width="{width}px" height="{height}px">
<nu-block  on:click='{() => showModal = false}'  width="100%" height="100%"   theme="modal">
</nu-block>
<nu-block class="absolute z-10" >
		<nu-btn class="float-right pb-1" on:click={() => (showModal = false)}>
      X
    </nu-btn>
    <slot handle={handleClose} />
	</nu-block>
</nu-flex>
{/if}
