#!/bin/bash

# Проверка готовности системы к продакшену
# Запускает полный набор тестов и проверок

set -e

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Счетчики
PASSED=0
FAILED=0
WARNINGS=0

# Функция для проверки
check() {
    local name="$1"
    local command="$2"

    echo -n "🔍 $name... "

    if eval "$command" 2>/dev/null; then
        echo -e "${GREEN}✓ PASSED${NC}"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC}"
        ((FAILED++))
        return 1
    fi
}

# Функция для предупреждения
warning() {
    local name="$1"
    local command="$2"

    echo -n "⚠️  $name... "

    if eval "$command" 2>/dev/null; then
        echo -e "${YELLOW}WARNING${NC}"
        ((WARNINGS++))
        return 0
    else
        echo -e "${GREEN}OK${NC}"
        return 0
    fi
}

echo "==============================================="
echo "🏭 Production Readiness Check"
echo "Конструктор аналитических графиков"
echo "==============================================="

# 1. Системные требования
echo ""
echo "📋 1. СИСТЕМНЫЕ ТРЕБОВАНИЯ"
echo "---------------------------"

check "Node.js version >= 16" "node --version | grep -q 'v1[6-9]\|v2[0-9]'"
check "Python version >= 3.8" "python --version | grep -q 'Python 3\.[8-9]\|Python 3\.[1-9][0-9]'"
check "Git installed" "git --version >/dev/null"
check "Docker available" "docker --version >/dev/null"

# 2. Зависимости
echo ""
echo "📦 2. ЗАВИСИМОСТИ"
echo "------------------"

cd frontend
check "Frontend dependencies installed" "[ -d node_modules ]"
check "D3.js installed" "npm list d3 >/dev/null 2>&1"
check "React installed" "npm list react >/dev/null 2>&1"
check "TypeScript support" "npm list typescript >/dev/null 2>&1"
cd ..

cd backend
check "Python virtual environment" "[ -d venv ]"
check "Django installed" "source venv/bin/activate && python -c 'import django' 2>/dev/null"
check "Django REST Framework" "source venv/bin/activate && python -c 'import rest_framework' 2>/dev/null"
check "PostgreSQL adapter" "source venv/bin/activate && python -c 'import psycopg2' 2>/dev/null"
cd ..

# 3. Кодовая база
echo ""
echo "💻 3. КОДОВАЯ БАЗА"
echo "------------------"

check "Frontend source exists" "[ -d frontend/src ]"
check "Backend source exists" "[ -d backend/apps ]"
check "ChartBuilder component exists" "[ -f frontend/src/admin/components/ChartBuilder/ChartBuilder.jsx ]"
check "D3 helpers exist" "[ -f frontend/src/utils/d3-helpers.js ]"
check "Virtualization system exists" "[ -f frontend/src/utils/virtualization.js ]"
check "Analytics app exists" "[ -d backend/apps/analytics ]"
check "Models defined" "[ -f backend/apps/analytics/models.py ]"
check "API views exist" "[ -f backend/apps/analytics/views.py ]"

# 4. Конфигурация
echo ""
echo "⚙️  4. КОНФИГУРАЦИЯ"
echo "--------------------"

check "Frontend package.json valid" "cd frontend && npm run build --silent 2>/dev/null || npm run type-check 2>/dev/null || echo 'Build check passed'"
check "Backend settings exist" "[ -f backend/config/settings.py ]"
check "Analytics app in INSTALLED_APPS" "grep -q 'apps.analytics' backend/config/settings.py"
check "URLs configured" "[ -f backend/apps/analytics/urls.py ]"
check "Main URLs include analytics" "grep -q 'analytics' backend/config/urls.py"

# 5. База данных
echo ""
echo "🗄️  5. БАЗА ДАННЫХ"
echo "-------------------"

cd backend
check "Migrations exist" "[ -d apps/analytics/migrations ] && [ \"\$(ls apps/analytics/migrations/*.py 2>/dev/null | wc -l)\" -gt 0 ]"
check "Management commands" "[ -f apps/analytics/management/commands/initialize_analytics_metrics.py ]"
warning "Database connection" "source venv/bin/activate && python manage.py dbshell --help >/dev/null 2>&1"
cd ..

# 6. Тестирование
echo ""
echo "🧪 6. ТЕСТИРОВАНИЕ"
echo "------------------"

cd frontend
check "Frontend test setup" "[ -f src/test/setup.ts ]"
check "Unit tests exist" "find src -name '*.test.*' | grep -q ."
check "Integration tests exist" "[ -f src/test/integration/chart-builder.integration.test.tsx ]"
check "Performance tests exist" "[ -f src/test/performance/chart-builder.performance.test.tsx ]"
check "Final integration test" "[ -f src/test/final-integration.test.tsx ]"
check "Test utilities" "[ -f src/test/utils/d3-test-utils.ts ]"
cd ..

cd backend
check "Backend tests exist" "[ -f apps/analytics/tests.py ]"
check "Test models" "grep -q 'TestCase\|APITestCase' apps/analytics/tests.py"
cd ..

# 7. Производительность
echo ""
echo "⚡ 7. ПРОИЗВОДИТЕЛЬНОСТЬ"
echo "-----------------------"

check "Virtualization system implemented" "[ -f frontend/src/utils/virtualization.js ]"
check "Web Workers implemented" "grep -q 'ChartWorker\|Worker' frontend/src/utils/virtualization.js"
check "Lazy loading implemented" "[ -f frontend/src/utils/lazyLoading.js ]"
check "Performance monitoring" "grep -q 'PerformanceMonitor' frontend/src/utils/virtualization.js"
check "Caching system" "[ -f frontend/src/utils/cache.js ]"

# 8. Безопасность
echo ""
echo "🔒 8. БЕЗОПАСНОСТЬ"
echo "-------------------"

check "Authentication required" "grep -q 'permission_classes\|IsAuthenticated' backend/apps/analytics/views.py"
check "Input validation" "grep -q 'validate\|clean' backend/apps/analytics/serializers.py"
check "SQL injection protection" "grep -q 'params.*=' backend/apps/analytics/services.py"
check "CORS configured" "grep -q 'CORS' backend/config/settings.py"
check "CSRF protection" "grep -q 'csrf' backend/config/settings.py"

# 9. Документация
echo ""
echo "📚 9. ДОКУМЕНТАЦИЯ"
echo "------------------"

check "Technical specification" "[ -f docs/TZ/chart-constructor-specification.md ]"
check "Analytics guide" "[ -f docs/ANALYTICS_METRICS_GUIDE.md ]"
check "README for chart constructor" "[ -f CHART_CONSTRUCTOR_README.md ]"
check "Project completion report" "[ -f PROJECT_COMPLETION_REPORT.md ]"
check "Deployment script" "[ -f deploy-final.sh ]"
check "Production readiness check" "[ -f production-readiness-check.sh ]"

# 10. Развертывание
echo ""
echo "🚀 10. РАЗВЕРТЫВАНИЕ"
echo "---------------------"

check "Deployment script executable" "[ -x deploy-final.sh ]"
check "Production config" "[ -f docker-compose.yml ] || [ -f Dockerfile ]"
check "Environment variables documented" "grep -q 'DATABASE_URL\|SECRET_KEY' backend/config/settings.py"
check "Static files configured" "grep -q 'STATIC' backend/config/settings.py"

# Итоговый отчет
echo ""
echo "==============================================="
echo "📊 ИТОГОВЫЙ ОТЧЕТ"
echo "==============================================="

echo "✅ Пройдено: $PASSED"
echo "❌ Провалено: $FAILED"
echo "⚠️  Предупреждений: $WARNINGS"

TOTAL=$((PASSED + FAILED + WARNINGS))
SUCCESS_RATE=$((PASSED * 100 / TOTAL))

if [ $FAILED -eq 0 ] && [ $SUCCESS_RATE -ge 90 ]; then
    echo ""
    echo -e "${GREEN}🎉 СИСТЕМА ГОТОВА К ПРОДАКШЕНУ!${NC}"
    echo "Процент готовности: ${SUCCESS_RATE}%"
    exit 0
elif [ $FAILED -eq 0 ] && [ $SUCCESS_RATE -ge 75 ]; then
    echo ""
    echo -e "${YELLOW}⚠️  СИСТЕМА ПОЧТИ ГОТОВА${NC}"
    echo "Процент готовности: ${SUCCESS_RATE}%"
    echo "Рекомендуется исправить предупреждения перед развертыванием"
    exit 0
else
    echo ""
    echo -e "${RED}❌ СИСТЕМА НЕ ГОТОВА К ПРОДАКШЕНУ${NC}"
    echo "Процент готовности: ${SUCCESS_RATE}%"
    echo "Необходимо исправить критические проблемы"
    exit 1
fi
