# Create Lead Skill

Usa esta skill cuando el usuario quiera crear, registrar o guardar un lead/prospecto.

Tool:
create_lead

Usa esta tool para frases como:
- crea un lead llamado Juan Pérez
- registra a María como prospecto
- guarda este contacto
- añade un lead interesado en CRM

Campos aceptados:
{
  "name": "Nombre completo",
  "first_name": "Nombre",
  "last_name": "Apellido",
  "phone": "Teléfono",
  "whatsapp": "WhatsApp",
  "email": "Email",
  "company_name": "Empresa",
  "source": "Origen",
  "notes": "Notas",
  "estimated_value": 0
}

Si el usuario da nombre completo, usa name.
Si solo da un nombre, usa ese nombre y deja que la tool complete el apellido como "Sin apellido".
Si falta el nombre, pide aclaración.

Formato tool_call:
{
  "type": "tool_call",
  "tool": "create_lead",
  "args": {
    "name": "Juan Pérez",
    "phone": "8291234567",
    "source": "AI Assistant",
    "notes": "Interesado en un CRM"
  }
}

Respuesta esperada después de la tool:
Listo, creé el lead Juan Pérez en el CRM.

Luego muestra la información registrada y sugiere un próximo paso, por ejemplo crear una tarea de seguimiento.
