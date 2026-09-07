const { createApp, ref, onMounted } = Vue;

// ★ここに手順1で取得したGASのウェブアプリのURLを貼り付けてください
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw8z_FiLZu7dc1wYYbzTRBlmdSJ_Ji5P4W08bEPqAULETiw1MHghPn5ZJsaxcY8OuQIHQ/exec";

createApp({
  setup() {
    const templates = ref([]);
    const isLoading = ref(true);
    const isSaving = ref(false);
    const toastMsg = ref('');
    const editingId = ref(null);
    const editForm = ref({ id: null, title: '', content: '' });

    // スプレッドシートからデータを取得
    const fetchTemplates = async () => {
      isLoading.value = true;
      try {
        const response = await fetch(GAS_API_URL);
        const data = await response.json();
        templates.value = data;
      } catch (err) {
        alert("データの読み込みに失敗しました。");
      } finally {
        isLoading.value = false;
      }
    };

    onMounted(() => {
      fetchTemplates();
    });

    const showToast = (msg) => {
      toastMsg.value = msg;
      setTimeout(() => { toastMsg.value = ''; }, 2000);
    };

    const copyText = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
        showToast('コピーしました！');
      } catch (err) {
        alert('コピーに失敗しました。');
      }
    };

    const startEdit = (tpl) => {
      editingId.value = tpl.id;
      editForm.value = { ...tpl };
    };

    const cancelEdit = () => {
      if (editForm.value.isNew) {
        templates.value = templates.value.filter(t => t.id !== editForm.value.id);
      }
      editingId.value = null;
    };

    const saveEdit = async () => {
      if(!editForm.value.title || !editForm.value.content) {
        alert("タイトルと本文を入力してください。");
        return;
      }
      
      isSaving.value = true;
      const index = templates.value.findIndex(t => t.id === editForm.value.id);
      delete editForm.value.isNew;
      
      if (index !== -1) {
        templates.value[index] = { ...editForm.value };
      }

      // スプレッドシートへ保存（同期）
      try {
        await fetch(GAS_API_URL, {
          method: "POST",
          body: JSON.stringify(templates.value)
        });
        showToast('スプレッドシートに保存しました');
      } catch (err) {
        alert("保存に失敗しました。");
      } finally {
        isSaving.value = false;
        editingId.value = null;
      }
    };

    const deleteTemplate = async (index) => {
      if(confirm('このテンプレートを削除してもよろしいですか？')) {
        templates.value.splice(index, 1);
        isSaving.value = true;
        try {
          await fetch(GAS_API_URL, {
            method: "POST",
            body: JSON.stringify(templates.value)
          });
          showToast('削除しました');
        } catch (err) {
          alert("削除に失敗しました。");
        } finally {
          isSaving.value = false;
          editingId.value = null;
        }
      }
    };

    const addNewTemplate = () => {
      const newId = Date.now();
      const newTpl = { id: newId, title: '', content: '', isNew: true };
      templates.value.unshift(newTpl);
      startEdit(newTpl);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return {
      templates, isLoading, isSaving, toastMsg, copyText,
      editingId, editForm, startEdit, cancelEdit, saveEdit,
      deleteTemplate, addNewTemplate, fetchTemplates
    };
  }
}).mount('#app');
