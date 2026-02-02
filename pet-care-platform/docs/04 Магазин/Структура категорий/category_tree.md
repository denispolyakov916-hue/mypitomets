# Структура категорий магазина (кошки + собаки)

Ниже — компактная, «магазинная» структура без глобальных категорий по типу животного.  
Тип животного предлагаю хранить на уровне товара: `cat`, `dog`, `all`.

## Дерево категорий (на сайте)

- `food` Питание
  - `food.dry` Сухой корм
  - `food.wet` Влажный корм
  - `food.semi_moist` Полувлажный корм
  - `food.canned` Консервы
  - `food.pouches` Паучи
  - `food.pate` Паштеты
  - `food.holistic` Холистики
  - `food.diet` Диетический корм
  - `food.hypoallergenic` Гипоаллергенный корм
  - `food.treats` Лакомства
  - `food.supplements` Витамины и добавки
  - `food.lifestage.kitten` Правильное питание для котенка
  - `food.lifestage.puppy` Правильное питание для щенка
- `health` Ветаптека
  - `health.parasite` Средства от паразитов
- `toilet` Туалеты и гигиена
  - `toilet.litter` Наполнители
  - `toilet.litter_boxes` Лотки
  - `toilet.litter_boxes_auto` Автоматические лотки
  - `toilet.bio_toilets` Биотуалеты
  - `toilet.waste_bags` Пакеты для выгула
  - `toilet.pads` Пеленки
  - `toilet.diapers` Подгузники
  - `toilet.scoops` Совочки
- `feeding` Миски и поилки
  - `feeding.bowls` Миски
  - `feeding.drinkers` Поилки
  - `feeding.bottles` Бутылочки
- `toys` Игрушки и развлечения
  - `toys.toys` Игрушки
  - `toys.scratching_posts` Когтеточки
  - `toys.playgrounds` Игровые площадки
  - `toys.tunnels` Тоннели
- `walk` Амуниция и выгул
  - `walk.collars` Ошейники
  - `walk.leashes` Поводки
  - `walk.harnesses` Шлейки
  - `walk.belts` Пояса
  - `walk.tags` Адресники
  - `walk.carabiners` Карабины
  - `walk.clickers` Кликеры
  - `walk.multiboxes` Мультибоксы
  - `walk.muzzles` Намордники
  - `walk.lights` Подсветки
  - `walk.retractable` Рулетки
  - `walk.bandanas` Банданы
  - `walk.popons` Попоны
  - `walk.accessories` Аксессуары
- `clothing` Одежда и обувь
  - `clothing.general` Одежда
  - `clothing.jumpsuits` Комбинезоны
  - `clothing.raincoats` Дождевики
  - `clothing.vests` Жилетки
  - `clothing.popons` Попоны
  - `clothing.jackets` Куртки
  - `clothing.sweaters` Свитера
  - `clothing.hats` Шапки
  - `clothing.socks` Носки
  - `clothing.shoes` Ботинки
  - `clothing.tshirts` Футболки
  - `clothing.tops` Майки
  - `clothing.suits` Костюмы
  - `clothing.hoodies` Толстовки
  - `clothing.dresses` Платья
  - `clothing.accessories` Аксессуары
- `care` Уход и гигиена
  - `care.grooming` Груминг
  - `care.shampoos` Шампуни
  - `care.conditioners` Кондиционеры
  - `care.sprays` Спреи
  - `care.lotions` Лосьоны
  - `care.gels` Гели
  - `care.waxes` Воски
  - `care.perfumes` Парфюмерия
  - `care.oils` Масла
  - `care.masks` Маски
  - `care.serums` Сыворотки
  - `care.creams` Крема
  - `care.foams` Пены
  - `care.mousses` Муссы
  - `care.tonics` Тоники
  - `care.balms` Бальзамы
  - `care.deodorants` Дезодоранты
  - `care.wipes` Салфетки
  - `care.soap` Мыло
  - `care.liquids` Жидкости
  - `care.drops` Капли
  - `care.dental_pastes` Зубные пасты
  - `care.dental_brushes` Зубные щетки
  - `care.claw_clippers` Когтерезы
  - `care.claw_grinders` Гриндеры
  - `care.claw_files` Пилочки
  - `care.brushes` Щетки
  - `care.combs` Расчески
  - `care.slickers` Пуходерки
  - `care.scissors` Ножницы
  - `care.rollers` Ролики
  - `care.scrapers` Скребки
  - `care.tweezers` Пинцеты
  - `care.powders` Пудры
  - `care.massagers` Массажеры
  - `care.furminators` Фурминаторы
  - `care.clippers` Машинки для стрижки
  - `care.trimmers` Триммеры
  - `care.detanglers` Колотунорезы
  - `care.towels` Полотенца
  - `care.paw_washers` Лапомойки
  - `care.protective_collars` Защитные воротники
  - `care.misc` Техничка и аксессуары
- `housing` Дом и транспорт
  - `housing.kennels` Будки
  - `housing.enclosures` Вольеры
  - `housing.houses` Домики
  - `housing.cages` Клетки
  - `housing.partitions` Перегородки
  - `housing.bags` Сумки
  - `housing.beds` Лежанки
  - `housing.carriers` Переноски
  - `housing.containers` Контейнеры
  - `housing.doors` Дверцы
  - `housing.grates` Решетки
  - `housing.wheels_carriers` Колеса для переносок
  - `housing.wheels_cages` Колеса для клеток
  - `housing.trays` Поддоны
  - `housing.carts` Тележки
  - `housing.strollers` Коляски
  - `housing.hammocks` Гамаки
  - `housing.bedding` Подстилки
  - `housing.mattresses` Матрасы
  - `housing.blankets` Пледы
  - `housing.pillows` Подушки
  - `housing.mats` Коврики
  - `housing.ramps` Пандусы
  - `housing.stairs` Лестницы
  - `housing.carrier_straps` Ремни для переносок
  - `housing.safety_belts` Ремни безопасности
  - `housing.accessories` Аксессуары для содержания
- `behavior` Контроль поведения
- `misc` Прочее
  - `misc.documents` Документы и паспорта
ё
## Маппинг внешних категорий → наши

> Для `Для кошек` и `Для собак` используется `mapping_type = animal_type`,
> они не попадают в дерево категорий.

| external_id | external_name | our_category_id | our_category_path | animal_type |
| --- | --- | --- | --- | --- |
| 2133 | Для кошек | animal_type:cat | Тип животного | cat |
| 2137 | Корм | food | Питание | cat |
| 2322 | Сухой | food.dry | Питание > Сухой корм | cat |
| 2320 | Влажный | food.wet | Питание > Влажный корм | cat |
| 2319 | Консервы | food.canned | Питание > Консервы | cat |
| 2318 | Паучи | food.pouches | Питание > Паучи | cat |
| 2317 | Паштет | food.pate | Питание > Паштеты | cat |
| 2316 | Холистики | food.holistic | Питание > Холистики | cat |
| 2315 | Диетический | food.diet | Питание > Диетический корм | cat |
| 2314 | Гипоаллергенный | food.hypoallergenic | Питание > Гипоаллергенный корм | cat |
| 2140 | Лакомства | food.treats | Питание > Лакомства | cat |
| 2141 | Витамины и добавки | food.supplements | Питание > Витамины и добавки | cat |
| 2342 | Ветаптека | health | Ветаптека | cat |
| 2152 | Средства от паразитов | health.parasite | Ветаптека > Средства от паразитов | cat |
| 2153 | Наполнители | toilet.litter | Туалеты и гигиена > Наполнители | cat |
| 2154 | Миски | feeding.bowls | Миски и поилки > Миски | cat |
| 2155 | Игрушки | toys.toys | Игрушки и развлечения > Игрушки | cat |
| 2156 | Амуниция | walk | Амуниция и выгул | cat |
| 2178 | Адресники | walk.tags | Амуниция и выгул > Адресники | cat |
| 2177 | Шлейки | walk.harnesses | Амуниция и выгул > Шлейки | cat |
| 2176 | Пояса | walk.belts | Амуниция и выгул > Пояса | cat |
| 2175 | Поводки | walk.leashes | Амуниция и выгул > Поводки | cat |
| 2174 | Ошейники | walk.collars | Амуниция и выгул > Ошейники | cat |
| 2157 | Средства по уходу | care | Уход и гигиена | cat |
| 2334 | Груминг | care.grooming | Уход и гигиена > Груминг | cat |
| 2337 | Когтеточки | toys.scratching_posts | Игрушки и развлечения > Когтеточки | cat |
| 2158 | Транспортировка и содержание | housing | Дом и транспорт | cat |
| 2276 | Бутылочки | feeding.bottles | Миски и поилки > Бутылочки | cat |
| 2275 | Колеса для переносок | housing.wheels_carriers | Дом и транспорт > Колеса для переносок | cat |
| 2274 | Решетки | housing.grates | Дом и транспорт > Решетки | cat |
| 2273 | Дверцы | housing.doors | Дом и транспорт > Дверцы | cat |
| 2272 | Тоннели | toys.tunnels | Игрушки и развлечения > Тоннели | cat |
| 2271 | Поилки | feeding.drinkers | Миски и поилки > Поилки | cat |
| 2270 | Пледы | housing.blankets | Дом и транспорт > Пледы | cat |
| 2269 | Игровые площадки | toys.playgrounds | Игрушки и развлечения > Игровые площадки | cat |
| 2268 | Поддоны | housing.trays | Дом и транспорт > Поддоны | cat |
| 2267 | Колеса для клеток | housing.wheels_cages | Дом и транспорт > Колеса для клеток | cat |
| 2266 | Клетки | housing.cages | Дом и транспорт > Клетки | cat |
| 2265 | Совочки | toilet.scoops | Туалеты и гигиена > Совочки | cat |
| 2264 | Пеленки | toilet.pads | Туалеты и гигиена > Пеленки | cat |
| 2263 | Тележки | housing.carts | Дом и транспорт > Тележки | cat |
| 2262 | Сумки | housing.bags | Дом и транспорт > Сумки | cat |
| 2261 | Коляски | housing.strollers | Дом и транспорт > Коляски | cat |
| 2260 | Гамаки | housing.hammocks | Дом и транспорт > Гамаки | cat |
| 2259 | Контейнеры | housing.containers | Дом и транспорт > Контейнеры | cat |
| 2258 | Ремни для переносок | housing.carrier_straps | Дом и транспорт > Ремни для переносок | cat |
| 2257 | Подстилки | housing.bedding | Дом и транспорт > Подстилки | cat |
| 2256 | Переноски | housing.carriers | Дом и транспорт > Переноски | cat |
| 2255 | Домики | housing.houses | Дом и транспорт > Домики | cat |
| 2254 | Матрасы | housing.mattresses | Дом и транспорт > Матрасы | cat |
| 2253 | Лежанки | housing.beds | Дом и транспорт > Лежанки | cat |
| 2252 | Паспорта | misc.documents | Прочее > Документы и паспорта | cat |
| 2159 | Одежда | clothing.general | Одежда и обувь > Одежда | cat |
| 2160 | Туалеты и принадлежности | toilet | Туалеты и гигиена | cat |
| 2339 | Контроль поведения | behavior | Контроль поведения | cat |
| 2132 | Для собак | animal_type:dog | Тип животного | dog |
| 2136 | Корм | food | Питание | dog |
| 2305 | Сухой | food.dry | Питание > Сухой корм | dog |
| 2307 | Влажный | food.wet | Питание > Влажный корм | dog |
| 2306 | Полувлажный | food.semi_moist | Питание > Полувлажный корм | dog |
| 2308 | Консервы | food.canned | Питание > Консервы | dog |
| 2309 | Паучи | food.pouches | Питание > Паучи | dog |
| 2310 | Паштет | food.pate | Питание > Паштеты | dog |
| 2311 | Холистики | food.holistic | Питание > Холистики | dog |
| 2312 | Диетический | food.diet | Питание > Диетический корм | dog |
| 2313 | Гипоаллергенный | food.hypoallergenic | Питание > Гипоаллергенный корм | dog |
| 2138 | Лакомства | food.treats | Питание > Лакомства | dog |
| 2139 | Витамины и добавки | food.supplements | Питание > Витамины и добавки | dog |
| 2346 | Правильное питание для щенка | food.lifestage.puppy | Питание > Правильное питание для щенка | dog |
| 2345 | Правильное питание для котенка | food.lifestage.kitten | Питание > Правильное питание для котенка | dog |
| 2341 | Ветаптека | health | Ветаптека | dog |
| 2144 | Средства от паразитов | health.parasite | Ветаптека > Средства от паразитов | dog |
| 2143 | Миски | feeding.bowls | Миски и поилки > Миски | dog |
| 2142 | Игрушки | toys.toys | Игрушки и развлечения > Игрушки | dog |
| 2332 | Груминг | care.grooming | Уход и гигиена > Груминг | dog |
| 2145 | Амуниция | walk | Амуниция и выгул | dog |
| 2164 | Шлейки | walk.harnesses | Амуниция и выгул > Шлейки | dog |
| 2170 | Адресники | walk.tags | Амуниция и выгул > Адресники | dog |
| 2173 | Карабины | walk.carabiners | Амуниция и выгул > Карабины | dog |
| 2168 | Кликеры | walk.clickers | Амуниция и выгул > Кликеры | dog |
| 2165 | Мультибоксы | walk.multiboxes | Амуниция и выгул > Мультибоксы | dog |
| 2169 | Намордники | walk.muzzles | Амуниция и выгул > Намордники | dog |
| 2161 | Ошейники | walk.collars | Амуниция и выгул > Ошейники | dog |
| 2162 | Поводки | walk.leashes | Амуниция и выгул > Поводки | dog |
| 2166 | Подсветки | walk.lights | Амуниция и выгул > Подсветки | dog |
| 2167 | Рулетки | walk.retractable | Амуниция и выгул > Рулетки | dog |
| 2172 | Попоны | walk.popons | Амуниция и выгул > Попоны | dog |
| 2171 | Банданы | walk.bandanas | Амуниция и выгул > Банданы | dog |
| 2163 | Пояса | walk.belts | Амуниция и выгул > Пояса | dog |
| 2149 | Одежда | clothing.general | Одежда и обувь > Одежда | dog |
| 2289 | Комбинезоны | clothing.jumpsuits | Одежда и обувь > Комбинезоны | dog |
| 2290 | Дождевики | clothing.raincoats | Одежда и обувь > Дождевики | dog |
| 2291 | Жилетки | clothing.vests | Одежда и обувь > Жилетки | dog |
| 2292 | Попоны | clothing.popons | Одежда и обувь > Попоны | dog |
| 2293 | Куртки | clothing.jackets | Одежда и обувь > Куртки | dog |
| 2294 | Свитера | clothing.sweaters | Одежда и обувь > Свитера | dog |
| 2295 | Шапки | clothing.hats | Одежда и обувь > Шапки | dog |
| 2296 | Носки | clothing.socks | Одежда и обувь > Носки | dog |
| 2297 | Ботинки | clothing.shoes | Одежда и обувь > Ботинки | dog |
| 2298 | Футболки | clothing.tshirts | Одежда и обувь > Футболки | dog |
| 2299 | Майки | clothing.tops | Одежда и обувь > Майки | dog |
| 2300 | Костюмы | clothing.suits | Одежда и обувь > Костюмы | dog |
| 2301 | Толстовки | clothing.hoodies | Одежда и обувь > Толстовки | dog |
| 2302 | Платья | clothing.dresses | Одежда и обувь > Платья | dog |
| 2147 | Средства по уходу | care | Уход и гигиена | dog |
| 2304 | Шампуни | care.shampoos | Уход и гигиена > Шампуни | dog |
| 2288 | Техничка | care.misc | Уход и гигиена > Техничка и аксессуары | dog |
| 2216 | Полотенца | care.towels | Уход и гигиена > Полотенца | dog |
| 2212 | Гриндеры | care.claw_grinders | Уход и гигиена > Гриндеры | dog |
| 2213 | Зубные пасты | care.dental_pastes | Уход и гигиена > Зубные пасты | dog |
| 2208 | Дезодорант | care.deodorants | Уход и гигиена > Дезодоранты | dog |
| 2207 | Бальзамы | care.balms | Уход и гигиена > Бальзамы | dog |
| 2209 | Тоники | care.tonics | Уход и гигиена > Тоники | dog |
| 2215 | Муссы | care.mousses | Уход и гигиена > Муссы | dog |
| 2210 | Пилочки | care.claw_files | Уход и гигиена > Пилочки | dog |
| 2206 | Капли | care.drops | Уход и гигиена > Капли | dog |
| 2211 | Пены | care.foams | Уход и гигиена > Пены | dog |
| 2205 | Крема | care.creams | Уход и гигиена > Крема | dog |
| 2203 | Маски | care.masks | Уход и гигиена > Маски | dog |
| 2202 | Сыворотки | care.serums | Уход и гигиена > Сыворотки | dog |
| 2204 | Когтерезы | care.claw_clippers | Уход и гигиена > Когтерезы | dog |
| 2200 | Фурминаторы | care.furminators | Уход и гигиена > Фурминаторы | dog |
| 2201 | Масла | care.oils | Уход и гигиена > Масла | dog |
| 2214 | Машинки для стрижки | care.clippers | Уход и гигиена > Машинки для стрижки | dog |
| 2197 | Расчески | care.combs | Уход и гигиена > Расчески | dog |
| 2196 | Пуходерки | care.slickers | Уход и гигиена > Пуходерки | dog |
| 2194 | Ножницы | care.scissors | Уход и гигиена > Ножницы | dog |
| 2198 | Ролики | care.rollers | Уход и гигиена > Ролики | dog |
| 2193 | Щетки | care.brushes | Уход и гигиена > Щетки | dog |
| 2199 | Скребки | care.scrapers | Уход и гигиена > Скребки | dog |
| 2187 | Салфетки | care.wipes | Уход и гигиена > Салфетки | dog |
| 2195 | Пинцеты | care.tweezers | Уход и гигиена > Пинцеты | dog |
| 2217 | Пудры | care.powders | Уход и гигиена > Пудры | dog |
| 2189 | Зубные щетки | care.dental_brushes | Уход и гигиена > Зубные щетки | dog |
| 2191 | Массажеры | care.massagers | Уход и гигиена > Массажеры | dog |
| 2186 | Мыло | care.soap | Уход и гигиена > Мыло | dog |
| 2185 | Кондиционеры | care.conditioners | Уход и гигиена > Кондиционеры | dog |
| 2179 | Шампуни | care.shampoos | Уход и гигиена > Шампуни | dog |
| 2188 | Жидкости | care.liquids | Уход и гигиена > Жидкости | dog |
| 2180 | Спреи | care.sprays | Уход и гигиена > Спреи | dog |
| 2183 | Воски | care.waxes | Уход и гигиена > Воски | dog |
| 2181 | Гели | care.gels | Уход и гигиена > Гели | dog |
| 2182 | Лосьоны | care.lotions | Уход и гигиена > Лосьоны | dog |
| 2184 | Парфюмерия | care.perfumes | Уход и гигиена > Парфюмерия | dog |
| 2190 | Триммеры | care.trimmers | Уход и гигиена > Триммеры | dog |
| 2192 | Колотунорезы | care.detanglers | Уход и гигиена > Колотунорезы | dog |
| 2148 | Транспортировка и содержание | housing | Дом и транспорт | dog |
| 2284 | Будки | housing.kennels | Дом и транспорт > Будки | dog |
| 2285 | Вольеры | housing.enclosures | Дом и транспорт > Вольеры | dog |
| 2286 | Домики | housing.houses | Дом и транспорт > Домики | dog |
| 2287 | Клетки | housing.cages | Дом и транспорт > Клетки | dog |
| 2230 | Перегородки | housing.partitions | Дом и транспорт > Перегородки | dog |
| 2232 | Сумки | housing.bags | Дом и транспорт > Сумки | dog |
| 2219 | Лежанки | housing.beds | Дом и транспорт > Лежанки | dog |
| 2223 | Переноски | housing.carriers | Дом и транспорт > Переноски | dog |
| 2234 | Пеленки | toilet.pads | Туалеты и гигиена > Пеленки | dog |
| 2283 | техничка | housing.accessories | Дом и транспорт > Аксессуары для содержания | dog |
| 2251 | Тоннели | toys.tunnels | Игрушки и развлечения > Тоннели | dog |
| 2250 | Пандусы | housing.ramps | Дом и транспорт > Пандусы | dog |
| 2249 | Бутылочки | feeding.bottles | Миски и поилки > Бутылочки | dog |
| 2248 | Лестницы | housing.stairs | Дом и транспорт > Лестницы | dog |
| 2247 | Дверцы | housing.doors | Дом и транспорт > Дверцы | dog |
| 2246 | Пояса | walk.belts | Амуниция и выгул > Пояса | dog |
| 2245 | Решетки | housing.grates | Дом и транспорт > Решетки | dog |
| 2243 | Поилки | feeding.drinkers | Миски и поилки > Поилки | dog |
| 2242 | Лапомойки | care.paw_washers | Уход и гигиена > Лапомойки | dog |
| 2241 | Пледы | housing.blankets | Дом и транспорт > Пледы | dog |
| 2240 | Поддоны | housing.trays | Дом и транспорт > Поддоны | dog |
| 2239 | Колеса для клеток | housing.wheels_cages | Дом и транспорт > Колеса для клеток | dog |
| 2233 | Тележки | housing.carts | Дом и транспорт > Тележки | dog |
| 2236 | Косынки | walk.accessories | Амуниция и выгул > Аксессуары | dog |
| 2235 | Коврики | housing.mats | Дом и транспорт > Коврики | dog |
| 2229 | Коляски | housing.strollers | Дом и транспорт > Коляски | dog |
| 2227 | Защитные воротники | care.protective_collars | Уход и гигиена > Защитные воротники | dog |
| 2226 | Подушки | housing.pillows | Дом и транспорт > Подушки | dog |
| 2231 | Ремни безопасности | housing.safety_belts | Дом и транспорт > Ремни безопасности | dog |
| 2224 | Контейнеры | housing.containers | Дом и транспорт > Контейнеры | dog |
| 2222 | Ремни для переносок | housing.carrier_straps | Дом и транспорт > Ремни для переносок | dog |
| 2221 | Подстилки | housing.bedding | Дом и транспорт > Подстилки | dog |
| 2228 | Гамаки | housing.hammocks | Дом и транспорт > Гамаки | dog |
| 2225 | Колеса для переносок | housing.wheels_carriers | Дом и транспорт > Колеса для переносок | dog |
| 2220 | Матрасы | housing.mattresses | Дом и транспорт > Матрасы | dog |
| 2218 | Паспорта | misc.documents | Прочее > Документы и паспорта | dog |
| 2151 | Туалеты и принадлежности | toilet | Туалеты и гигиена | dog |
| 2277 | Автоматические лотки | toilet.litter_boxes_auto | Туалеты и гигиена > Автоматические лотки | dog |
| 2278 | Биотуалеты | toilet.bio_toilets | Туалеты и гигиена > Биотуалеты | dog |
| 2279 | Пакеты для выгула | toilet.waste_bags | Туалеты и гигиена > Пакеты для выгула | dog |
| 2280 | Лотки | toilet.litter_boxes | Туалеты и гигиена > Лотки | dog |
| 2281 | Пеленки | toilet.pads | Туалеты и гигиена > Пеленки | dog |
| 2282 | Подгузники | toilet.diapers | Туалеты и гигиена > Подгузники | dog |
| 2338 | Контроль поведения | behavior | Контроль поведения | dog |

