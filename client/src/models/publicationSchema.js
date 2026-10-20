import { z } from 'zod';

export const publicationTypes = ['Статья', 'Монография', 'Доклад'];
export const departments = ['Информационные системы', 'Прикладная математика', 'Вычислительная техника', 'Программная инженерия', 'Экономика и управление'];

export const publicationSchema = z.object({
  title: z.string().trim().min(3, 'Название: минимум 3 символа.').max(200, 'Название: максимум 200 символов.'),
  authors: z.string().trim().min(1, 'Укажите авторов.'),
  year: z.coerce.number({ error: 'Год должен быть числом.' })
    .int('Год должен быть целым числом.')
    .min(1900, 'Год должен быть не ранее 1900.')
    .refine(year => year <= new Date().getFullYear() + 1, 'Год не может превышать следующий календарный год.'),
  type: z.enum(publicationTypes, { error: 'Выберите тип публикации.' }),
  department: z.enum(departments, { error: 'Выберите подразделение из списка.' }),
  owner: z.string().trim().min(1, 'Укажите сотрудника.'),
});
