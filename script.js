const { createApp, ref, onMounted } = Vue;

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbw8z_FiLZu7dc1wYYbzTRBlmdSJ_Ji5P4W08bEPqAULETiw1MHghPn5ZJsaxcY8OuQIHQ/exec";

createApp({
  setup() {
    const templates = ref([]);
    const isLoading = ref(true);
    const isSaving = ref(false);
    const toastMsg = ref('');
    const editingId = ref(null);
    const editForm = ref({ id: null, title: '', content: '' });

    const fetchTemplates = () => {
      isLoading.value = true;
      window.handleResponse = (data) => {
        templates.value = data;
        isLoading.value = false;
        const scriptTag = document.getElementById('jsonp-script');
        if (scriptTag) scriptTag.remove();
      };

      const oldScript = document.getElementById('jsonp-script');
      if (oldScript) oldScript.remove();

      const script = document.createElement('script');
      script.id = 'jsonp-script';
      script.src = `${GAS_API_URL}?callback=handleResponse`;
      script.onerror = () => {
        isLoading.value = false;
        alert("データの読み込みに失敗しました。");
      };
      document.body.appendChild(script);
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
        // データ内に "\n"（文字列）が混ざっていても本物の改行に置換してコピーする
        const formattedText = String(text).replace(/\\n/g, '\n');
        await navigator.clipboard.writeText(formattedText);
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

    const saveToSpreadsheet = (dataToSave) => {
      return new Promise((resolve) => {
        let iframe = document.getElementById('hidden-iframe');
        if (!iframe) {
          iframe = document.createElement('iframe');
          iframe.id = 'hidden-iframe';
          iframe.name = 'hidden-iframe';
          iframe.style.display = 'none';
          document.body.appendChild(iframe);
        }

        const form = document.createElement('form');
        form.method = 'POST';
        form.action = GAS_API_URL;
        form.target = 'hidden-iframe';

        const input = document.createElement('input');
        input.type = 'hidden';
        input.name = 'data';
        input.value = JSON.stringify(dataToSave);
        form.appendChild(input);

        document.body.appendChild(form);
        form.submit();
        form.remove();

        setTimeout(() => {
          resolve();
        }, 1000);
      });
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

      try {
        await saveToSpreadsheet(templates.value);
        showToast('スプレッドシートに保存しました');
        setTimeout(fetchTemplates, 1500);
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
          await saveToSpreadsheet(templates.value);
          showToast('削除しました');
          setTimeout(fetchTemplates, 1500);
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
