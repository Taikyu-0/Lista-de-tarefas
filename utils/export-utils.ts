// Função alternativa para exportar CSV (compatível com Excel)
export const exportToCSV = (tasks: any[], formatTime: (seconds: number) => string) => {
  try {
    const criacaoTasks = tasks.filter((task) => task.category === "criacao")
    const ajustesTasks = tasks.filter((task) => task.category === "ajustes")

    const getTotalTimeForTask = (task: any) => task.totalTime + task.currentTime

    // Cabeçalho
    let csvContent = "Nome da Tarefa,Categoria,Tempo Total (segundos),Tempo Formatado,Status\n"

    // Dados das tarefas
    tasks.forEach((task) => {
      const row = [
        `"${task.name}"`,
        task.category === "criacao" ? "Criação" : "Ajustes",
        getTotalTimeForTask(task),
        `"${formatTime(getTotalTimeForTask(task))}"`,
        task.isRunning ? "Em execução" : "Parado",
      ].join(",")
      csvContent += row + "\n"
    })

    // Resumo
    csvContent += "\n"
    csvContent += "RESUMO GERAL,,,\n"
    csvContent += `Total Criação,,${criacaoTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0)},"${formatTime(criacaoTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}",\n`
    csvContent += `Total Ajustes,,${ajustesTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0)},"${formatTime(ajustesTasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}",\n`
    csvContent += `TEMPO TOTAL GERAL,,${tasks.reduce((total, task) => total + getTotalTimeForTask(task), 0)},"${formatTime(tasks.reduce((total, task) => total + getTotalTimeForTask(task), 0))}",\n`

    // Criar e baixar arquivo
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)

    const today = new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")
    link.setAttribute("download", `Lista_do_Rafa_${today}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  } catch (error) {
    console.error("Erro ao exportar CSV:", error)
    alert("Erro ao exportar arquivo. Tente novamente.")
  }
}
