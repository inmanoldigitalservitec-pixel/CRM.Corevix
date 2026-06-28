# Create Client Skill

Usa esta skill cuando el usuario quiera crear, registrar o guardar un cliente.

Tool:
create_client

Usa esta tool para frases como:
- crea un cliente llamado Empresa X
- registra este cliente
- guarda esta empresa como cliente
- añade a Corevix como cliente

Campos aceptados:
{
  "company_name": "Nombre de empresa",
  "name": "Nombre alternativo",
  "contact_person": "Persona de contacto",
  "phone": "Teléfono",
  "email": "Email",
  "status": "active",
  "tags": []
}

Si falta el nombre del cliente o empresa, pide aclaración.

Formato tool_call:
{
  "type": "tool_call",
  "tool": "create_client",
  "args": {
    "company_name": "Empresa X",
    "contact_person": "Juan Pérez",
    "phone": "8291234567",
    "email": "juan@empresa.com"
  }
}

Después de ejecutar, responde humano, muestra los datos guardados y sugiere un próximo paso.
