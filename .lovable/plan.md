# Salas nocturnas por tema

## Resultado
- Usar la nueva imagen subida como pantalla de entrada a las salas, ocupando toda la pantalla y sin repetir ni deformar.
- Al tocar “Entra a desahogarte”, mostrar una selección desplazable con las ocho salas y sus textos exactos.
- Mostrar en cada sala cuántas personas estuvieron activas durante el último minuto.
- Entrar o reutilizar una sala según su tema y abrir únicamente los mensajes de esa sala.
- Mostrar en la cabecera el nombre elegido, “- Lara” y la cantidad activa de esa sala.

## Datos y tiempo real
- Crear `rooms` para las ocho salas y `presencia_sala` para la actividad por persona y sala.
- Asociar cada mensaje a una sala sin romper los mensajes existentes.
- Aplicar permisos para que cada persona autenticada pueda mantener su propia presencia y participar en salas.
- Actualizar presencia al entrar y cada 30 segundos; refrescar conteos también cada 30 segundos y al recibir cambios en tiempo real.
- Retirar la presencia al salir del chat o cerrar la página cuando sea posible.

## Interfaz
- Mantener portada, acceso por apodo, estilo nocturno, chat y cafecito actuales.
- Añadir `SeleccionSalas.jsx` con botones grandes, textos secundarios y conteos.
- Volver desde el chat a la selección de salas, no al mapa.

## Verificación
- Comprobar el flujo portada → apodo → nueva imagen → selección → sala → mensaje.
- Confirmar filtrado de mensajes, conteos activos, actualización en vivo y visual móvil.
