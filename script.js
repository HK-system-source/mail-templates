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

    // JSONPを使った安全な読み込み
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

// CORSやリダイレクト制限を完全に回避してPOSTするための隠しフォーム送信テクニック
const saveToSpreadsheet = (dataToSave) => {
  return new Promise((resolve) => {
    // 1. ページ内に隠しiframeを作成（レスポンス画面を表示させないため）
    let iframe = document.getElementById('hidden-iframe');
    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.id = 'hidden-iframe';
      iframe.name = 'hidden-iframe';
      iframe.style.display = 'none';
      document.body.appendChild(iframe);
    }

    // 2. 隠しformを動的に作成
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = GAS_API_URL;
    form.target = 'hidden-iframe'; // 送信結果を隠しiframeに向ける

    // 3. データをinputとして埋め込む
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'data';
    input.value = JSON.stringify(dataToSave);
    form.appendChild(input);

    document.body.appendChild(form);
    
    // 4. 送信を実行し、要素を掃除する
    form.submit();
    form.remove();

    // フォーム送信は通信完了が取れないため、1秒後に成功として処理を進める
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
        // 少し待ってから最新データを再読み込み
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
