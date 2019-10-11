<script>
import Modal from "../components/Modal.svelte";

</script>

<Modal
        buttonName="Модальное окно"
        buttonColor="bg-green-500"
        let:handle={handleClose}>
        <nu-block >
				<nu-theme  color="#333" background-color="#fff" special-color="#3366ff" border-color="#ddd">
				</nu-theme>
				<nu-theme  name="primary" color="#1885d9" background-color="#fff" special-color="#1885d9" shadow-opacity=".2">
				</nu-theme>
				<nu-card shadow border="1px" depth theme="primary">
					<nu-flex flow="column" padding="2|2|1" rows="repeat(3,1fr)" cols="200px"  gap="1">
						<nu-block >
							<h1>Header</h1>
							<nu-separator></nu-separator>
						</nu-block>
						<nu-btn-group flow="column" radius="1" border="0.25" theme="!">
							<nu-btn>One</nu-btn>
							<nu-btn>Two</nu-btn>
						</nu-btn-group>
						<nu-block theme="default">
							<nu-toggle></nu-toggle>
						</nu-block>
						<nu-btn-group>
							<nu-input cols="auto 1fr" items="center">
								<nu-block width="3">
									<nu-icon name="gitlab" size="1.25"></nu-icon>
								</nu-block>
								<input />
							</nu-input>
							<nu-btn theme="!primary" grow="0" on:click='{() => handleClose() }'>Submit</nu-btn>
						</nu-btn-group>
					</nu-flex>
				</nu-card>
			</nu-block>
      </Modal>