// Ana değişkenler
let transactions = [];
let categories = [];

// AOS Animasyon başlat
AOS.init({
    duration: 800,
    once: true
});

// Tema değiştirme
function toggleTheme() {
    const root = document.documentElement;
    const isDark = root.classList.contains('dark');
    
    root.classList.toggle('dark');
    localStorage.theme = isDark ? 'light' : 'dark';

    // Grafikleri güncelle
    updateCharts();
}

// Para formatı
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        minimumFractionDigits: 2
    }).format(amount);
};

// Yüzde formatı
const formatPercent = (value) => {
    return new Intl.NumberFormat('tr-TR', {
        style: 'percent',
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(value / 100);
};

// Tarih formatı
const formatDate = (date) => {
    return new Date(date).toLocaleDateString('tr-TR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
};

// Modal işlemleri
function openNewTransactionModal() {
    document.getElementById('newTransactionModal').showModal();
    document.getElementById('date').valueAsDate = new Date();
    updateCategorySelect();
}

function closeNewTransactionModal() {
    document.getElementById('newTransactionModal').close();
    document.getElementById('transactionForm').reset();
}

// İşlemleri görüntüle
function displayTransactions(filteredTransactions = transactions) {
    const tbody = document.getElementById('transactionsList');
    tbody.innerHTML = '';

    filteredTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .forEach((t, index) => {
            const row = document.createElement('tr');
            row.className = 'fade-in hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors';
            row.style.animationDelay = `${index * 0.1}s`;
            
            row.innerHTML = `
                <td class="py-3">
                    <div class="font-medium">${formatDate(t.date)}</div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">
                        ${t.description || '-'}
                    </div>
                </td>
                <td>
                    <span class="px-2 py-1 rounded-full text-xs font-medium
                        ${t.type === 'income' ? 
                        'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}">
                        ${t.category}
                    </span>
                    ${t.is_recurring ? '<i class="fas fa-sync-alt ml-2 text-gray-500" title="Düzenli İşlem"></i>' : ''}
                </td>
                <td class="text-right font-medium
                    ${t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </td>
                <td class="text-center">
                    <button onclick="deleteTransaction(${t.id})" 
                            class="btn btn-ghost btn-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
}

// İstatistikleri güncelle
function updateStats() {
    // Toplam değerler
    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalIncome - totalExpense;

    // Bu ayın değerleri
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyIncome = transactions
        .filter(t => t.type === 'income' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpense = transactions
        .filter(t => t.type === 'expense' && t.date.startsWith(currentMonth))
        .reduce((sum, t) => sum + t.amount, 0);

    const monthlyBalance = monthlyIncome - monthlyExpense;

    // Geçen aya göre değişim
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1))
        .toISOString().slice(0, 7);
    
    const lastMonthBalance = transactions
        .filter(t => t.date.startsWith(lastMonth))
        .reduce((sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0);

    const balanceChange = lastMonthBalance !== 0 
        ? ((monthlyBalance - lastMonthBalance) / Math.abs(lastMonthBalance) * 100)
        : 100;

    // Değerleri güncelle
    document.getElementById('totalBalance').textContent = formatCurrency(netBalance);
    document.getElementById('monthlyIncome').textContent = formatCurrency(monthlyIncome);
    document.getElementById('monthlyExpense').textContent = formatCurrency(monthlyExpense);
    document.getElementById('monthlyNet').textContent = formatCurrency(monthlyBalance);
    
    const changeElement = document.getElementById('balanceChange');
    changeElement.textContent = `Geçen aya göre değişim: ${formatPercent(balanceChange)}`;
    changeElement.className = `stat-desc ${balanceChange >= 0 ? 'text-success' : 'text-error'}`;
}

// Grafikleri güncelle
function updateCharts() {
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#FFFFFF' : '#000000';

    // Gelir/Gider Dağılımı Grafiği
    const ctx1 = document.getElementById('incomeExpenseChart').getContext('2d');
    if (window.incomeExpenseChart) {
        window.incomeExpenseChart.destroy();
    }

    const totalIncome = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpense = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);

    window.incomeExpenseChart = new Chart(ctx1, {
        type: 'doughnut',
        data: {
            labels: ['Gelir', 'Gider'],
            datasets: [{
                data: [totalIncome, totalExpense],
                backgroundColor: [
                    'rgba(72, 187, 120, 0.8)',
                    'rgba(239, 68, 68, 0.8)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor
                    }
                }
            }
        }
    });

    // Kategori Bazlı Giderler Grafiği
    const ctx2 = document.getElementById('categoryExpenseChart').getContext('2d');
    if (window.categoryExpenseChart) {
        window.categoryExpenseChart.destroy();
    }

    const expensesByCategory = {};
    transactions
        .filter(t => t.type === 'expense')
        .forEach(t => {
            expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount;
        });

    window.categoryExpenseChart = new Chart(ctx2, {
        type: 'bar',
        data: {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                label: 'Giderler',
                data: Object.values(expensesByCategory),
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: textColor
                    }
                },
                x: {
                    ticks: {
                        color: textColor
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Kategori select'i güncelleme
function updateCategorySelect() {
    const typeSelect = document.getElementById('type');
    const categorySelect = document.getElementById('category');
    const selectedType = typeSelect.value;

    categorySelect.innerHTML = '';
    
    const filteredCategories = categories
        .filter(c => c.type === selectedType)
        .sort((a, b) => a.name.localeCompare(b.name));
    
    filteredCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.name;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });

    // Yeni kategori seçeneği
    const newCategoryOption = document.createElement('option');
    newCategoryOption.value = 'diger';
    newCategoryOption.textContent = '+ Yeni Kategori';
    categorySelect.appendChild(newCategoryOption);
}

// Ay filtresi doldurma
function populateMonthFilter() {
    const monthSelect = document.getElementById('monthFilter');
    if (!monthSelect) return;

    const months = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(2024, i, 1);
        return {
            value: i + 1,
            label: date.toLocaleString('tr-TR', { month: 'long' })
        };
    });

    const currentMonth = new Date().getMonth() + 1;
    
    months.forEach(month => {
        const option = document.createElement('option');
        option.value = month.value;
        option.textContent = month.label;
        if (month.value === currentMonth) {
            option.selected = true;
        }
        monthSelect.appendChild(option);
    });
}

// İşlem silme
async function deleteTransaction(id) {
    const result = await Swal.fire({
        title: 'Emin misiniz?',
        text: "Bu işlemi geri alamazsınız!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Evet, sil!',
        cancelButtonText: 'İptal',
        background: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
        color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/api/transactions/${id}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                transactions = transactions.filter(t => t.id !== id);
                updateUI();
                
                Swal.fire({
                    icon: 'success',
                    title: 'Silindi!',
                    text: 'İşlem başarıyla silindi.',
                    timer: 2000,
                    showConfirmButton: false,
                    background: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
                    color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000'
                });
            }
        } catch (error) {
            console.error('İşlem silinirken hata:', error);
            Swal.fire({
                icon: 'error',
                title: 'Hata!',
                text: 'İşlem silinirken bir hata oluştu.',
                background: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
                color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000'
            });
        }
    }
}

// UI'ı güncelle
function updateUI() {
    displayTransactions();
    updateStats();
    updateCharts();
}

// API'den verileri yükle
async function loadData() {
    try {
        // İşlemleri yükle
        const transactionsResponse = await fetch('/api/transactions');
        transactions = await transactionsResponse.json();

        // Kategorileri yükle
        const categoriesResponse = await fetch('/api/categories');
        categories = await categoriesResponse.json();

        updateUI();
    } catch (error) {
        console.error('Veri yüklenirken hata:', error);
        Swal.fire({
            icon: 'error',
            title: 'Hata!',
            text: 'Veriler yüklenirken bir hata oluştu.',
            background: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
            color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000'
        });
    }
}

// Sayfa yüklendiğinde
document.addEventListener('DOMContentLoaded', function() {
    // Form elementi
    const form = document.getElementById('transactionForm');
    const categorySelect = document.getElementById('category');
    const newCategoryGroup = document.getElementById('newCategoryGroup');
    
    // Ay filtresi için ayları doldur
    populateMonthFilter();

    // İşlem tipi değiştiğinde kategorileri güncelle
    document.getElementById('type').addEventListener('change', updateCategorySelect);

    // Kategori değişimini izle
    categorySelect.addEventListener('change', function() {
        newCategoryGroup.style.display = 
            this.value === 'diger' ? 'block' : 'none';
    });

    // Form gönderildiğinde
    form.addEventListener('submit', async function(e) {
        e.preventDefault();

        const formData = {
            type: document.getElementById('type').value,
            category: categorySelect.value === 'diger' ? 
                document.getElementById('newCategory').value : 
                categorySelect.value,
            amount: parseFloat(document.getElementById('amount').value),
            date: document.getElementById('date').value,
            description: document.getElementById('description').value,
            is_recurring: document.getElementById('isRecurring').checked
        };

        try {
            const response = await fetch('/api/transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const result = await response.json();
                
                // Yeni kategori ekle
                if (categorySelect.value === 'diger') {
                    const newCategory = {
                        name: formData.category,
                        type: formData.type
                    };
                    
                    const categoryResponse = await fetch('/api/categories', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(newCategory)
                    });

                    if (categoryResponse.ok) {
                        const categoryResult = await categoryResponse.json();
                        categories.push({
                            id: categoryResult.id,
                            name: newCategory.name,
                            type: newCategory.type
                        });
                    }
                }

                // İşlemi listeye ekle
                formData.id = result.id;
                transactions.push(formData);

                // Başarılı mesajı göster
                Swal.fire({
                    icon: 'success',
                    title: 'Başarılı!',
                    text: 'Yeni işlem kaydedildi.',
                    timer: 2000,
                    showConfirmButton: false,
                    timerProgressBar: true,
                    background: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
                    color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000'
                });

                closeNewTransactionModal();
                form.reset();
                updateUI();
            } else {
                throw new Error('İşlem kaydedilemedi');
            }
        } catch (error) {
            console.error('İşlem kaydedilirken hata:', error);
            Swal.fire({
                icon: 'error',
                title: 'Hata!',
                text: 'İşlem kaydedilirken bir hata oluştu.',
                background: document.documentElement.classList.contains('dark') ? '#1F2937' : '#FFFFFF',
                color: document.documentElement.classList.contains('dark') ? '#FFFFFF' : '#000000'
            });
        }
    });

    // Ay filtresi değiştiğinde
    const monthFilter = document.getElementById('monthFilter');
    if (monthFilter) {
        monthFilter.addEventListener('change', function() {
            const selectedMonth = this.value;
            const filteredTransactions = transactions.filter(t => {
                const transactionMonth = new Date(t.date).getMonth() + 1;
                return transactionMonth === parseInt(selectedMonth);
            });
            displayTransactions(filteredTransactions);
        });
    }

    // İşlem tipi filtresi değiştiğinde
    const typeFilter = document.getElementById('typeFilter');
    if (typeFilter) {
        typeFilter.addEventListener('change', function() {
            const selectedType = this.value;
            const filteredTransactions = selectedType === 'all' 
                ? transactions 
                : transactions.filter(t => t.type === selectedType);
            displayTransactions(filteredTransactions);
        });
    }

    // Karanlık mod kontrolü
    if (localStorage.theme === 'dark' || 
        (!('theme' in localStorage) && 
         window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }

    // Verileri yükle
    loadData();
});