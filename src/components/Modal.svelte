<script>
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
  <nu-btn class="{buttonColor} hover:{buttonHover()} text-white font-bold py-2 px-4 rounded" on:click={()=> (showModal =
    true)}>
    {buttonName}
  </nu-btn>
</slot>

<svelte:window bind:innerHeight={height} bind:innerWidth={width} />
{#if showModal}



<nu-flex nu-themes="default minor primary" content="center" theme="primary" items="center" class="inset-0 fixed z-10"   width="{width}px" height="{height}px">
    <nu-theme color="rgba(67.5%, 8.6%, 21.3%, 100%)" background-color="#fff"  special-color="rgba(0,0,0,1)"></nu-theme>
<nu-block  on:click='{() => showModal = false}'  width="100%" height="100%"></nu-block>
<nu-block class="absolute z-10 " >
		<!-- <nu-btn  style="top: 15px; right: 15px;"  mod="transparent"  width="2px" height="2px" border="none" class="float-right m-0 p-0  z-10 hover:text-red-200" on:click={() => (showModal = false)}>
      X
    </nu-btn> -->
    <slot handle={handleClose} />
	</nu-block>
</nu-flex>
{/if}